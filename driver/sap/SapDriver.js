"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SapDriver = void 0;
var tslib_1 = require("tslib");
var __1 = require("../..");
var DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
var PlatformTools_1 = require("../../platform/PlatformTools");
var RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
var ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
var DateUtils_1 = require("../../util/DateUtils");
var OrmUtils_1 = require("../../util/OrmUtils");
var SapQueryRunner_1 = require("./SapQueryRunner");
var DriverUtils_1 = require("../DriverUtils");
var View_1 = require("../../schema-builder/view/View");
/**
 * Organizes communication with SAP Hana DBMS.
 *
 * todo: looks like there is no built in support for connection pooling, we need to figure out something
 */
var SapDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function SapDriver(connection) {
        /**
         * Pool for slave databases.
         * Used in replication.
         */
        this.slaves = [];
        /**
         * Indicates if replication is enabled.
         */
        this.isReplicated = false;
        /**
         * Indicates if tree tables are supported by this driver.
         */
        this.treeSupport = true;
        /**
         * Represent transaction support by this driver
         */
        this.transactionSupport = "simple";
        /**
         * Gets list of supported column data types by a driver.
         *
         * @see https://help.sap.com/viewer/4fe29514fd584807ac9f2a04f6754767/2.0.03/en-US/20a1569875191014b507cf392724b7eb.html
         */
        this.supportedDataTypes = [
            "tinyint",
            "smallint",
            "int",
            "integer",
            "bigint",
            "smalldecimal",
            "decimal",
            "dec",
            "real",
            "double",
            "float",
            "date",
            "time",
            "seconddate",
            "timestamp",
            "boolean",
            "char",
            "nchar",
            "varchar",
            "nvarchar",
            "text",
            "alphanum",
            "shorttext",
            "array",
            "varbinary",
            "blob",
            "clob",
            "nclob",
            "st_geometry",
            "st_point",
        ];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [
            "st_geometry",
            "st_point",
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "varchar",
            "nvarchar",
            "alphanum",
            "shorttext",
            "varbinary"
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "decimal",
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "decimal",
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "timestamp",
            createDateDefault: "CURRENT_TIMESTAMP",
            updateDate: "timestamp",
            updateDateDefault: "CURRENT_TIMESTAMP",
            deleteDate: "timestamp",
            deleteDateNullable: true,
            version: "integer",
            treeLevel: "integer",
            migrationId: "integer",
            migrationName: "nvarchar",
            migrationTimestamp: "bigint",
            cacheId: "integer",
            cacheIdentifier: "nvarchar",
            cacheTime: "bigint",
            cacheDuration: "integer",
            cacheQuery: "nvarchar(5000)",
            cacheResult: "text",
            metadataType: "nvarchar",
            metadataDatabase: "nvarchar",
            metadataSchema: "nvarchar",
            metadataTable: "nvarchar",
            metadataName: "nvarchar",
            metadataValue: "nvarchar(5000)",
        };
        /**
         * Default values of length, precision and scale depends on column data type.
         * Used in the cases when length/precision/scale is not specified by user.
         */
        this.dataTypeDefaults = {
            "char": { length: 1 },
            "nchar": { length: 1 },
            "varchar": { length: 255 },
            "nvarchar": { length: 255 },
            "shorttext": { length: 255 },
            "varbinary": { length: 255 },
            "decimal": { precision: 18, scale: 0 },
        };
        /**
         * Max length allowed by SAP HANA for aliases (identifiers).
         * @see https://help.sap.com/viewer/4fe29514fd584807ac9f2a04f6754767/2.0.03/en-US/20a760537519101497e3cfe07b348f3c.html
         */
        this.maxAliasLength = 128;
        this.connection = connection;
        this.options = connection.options;
        this.loadDependencies();
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).database;
        this.schema = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).schema;
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    SapDriver.prototype.connect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var dbParams, options, logger, poolErrorHandler, queryRunner, _a, _b;
            return (0, tslib_1.__generator)(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        dbParams = (0, tslib_1.__assign)({ hostName: this.options.host, port: this.options.port, userName: this.options.username, password: this.options.password }, this.options.extra);
                        if (this.options.database)
                            dbParams.databaseName = this.options.database;
                        if (this.options.encrypt)
                            dbParams.encrypt = this.options.encrypt;
                        if (this.options.sslValidateCertificate)
                            dbParams.validateCertificate = this.options.sslValidateCertificate;
                        if (this.options.key)
                            dbParams.key = this.options.key;
                        if (this.options.cert)
                            dbParams.cert = this.options.cert;
                        if (this.options.ca)
                            dbParams.ca = this.options.ca;
                        options = {
                            min: this.options.pool && this.options.pool.min ? this.options.pool.min : 1,
                            max: this.options.pool && this.options.pool.max ? this.options.pool.max : 10,
                        };
                        if (this.options.pool && this.options.pool.checkInterval)
                            options.checkInterval = this.options.pool.checkInterval;
                        if (this.options.pool && this.options.pool.maxWaitingRequests)
                            options.maxWaitingRequests = this.options.pool.maxWaitingRequests;
                        if (this.options.pool && this.options.pool.requestTimeout)
                            options.requestTimeout = this.options.pool.requestTimeout;
                        if (this.options.pool && this.options.pool.idleTimeout)
                            options.idleTimeout = this.options.pool.idleTimeout;
                        logger = this.connection.logger;
                        poolErrorHandler = options.poolErrorHandler || (function (error) { return logger.log("warn", "SAP Hana pool raised an error. ".concat(error)); });
                        this.client.eventEmitter.on("poolError", poolErrorHandler);
                        // create the pool
                        this.master = this.client.createPool(dbParams, options);
                        if (!(!this.database || !this.schema)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.createQueryRunner("master")];
                    case 1:
                        queryRunner = _c.sent();
                        if (!!this.database) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, queryRunner.getCurrentDatabase()];
                    case 2:
                        _a.database = _c.sent();
                        _c.label = 3;
                    case 3:
                        if (!!this.schema) return [3 /*break*/, 5];
                        _b = this;
                        return [4 /*yield*/, queryRunner.getCurrentSchema()];
                    case 4:
                        _b.schema = _c.sent();
                        _c.label = 5;
                    case 5: return [4 /*yield*/, queryRunner.release()];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    SapDriver.prototype.afterConnect = function () {
        return Promise.resolve();
    };
    /**
     * Closes connection with the database.
     */
    SapDriver.prototype.disconnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var promise;
            return (0, tslib_1.__generator)(this, function (_a) {
                promise = this.master.clear();
                this.master = undefined;
                return [2 /*return*/, promise];
            });
        });
    };
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    SapDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    SapDriver.prototype.createQueryRunner = function (mode) {
        return new SapQueryRunner_1.SapQueryRunner(this, mode);
    };
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    SapDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
        var _this = this;
        var escapedParameters = Object.keys(nativeParameters).map(function (key) {
            if (nativeParameters[key] instanceof Date)
                return DateUtils_1.DateUtils.mixedDateToDatetimeString(nativeParameters[key], true);
            return nativeParameters[key];
        });
        if (!parameters || !Object.keys(parameters).length)
            return [sql, escapedParameters];
        sql = sql.replace(/:(\.\.\.)?([A-Za-z0-9_.]+)/g, function (full, isArray, key) {
            if (!parameters.hasOwnProperty(key)) {
                return full;
            }
            var value = parameters[key];
            if (isArray) {
                return value.map(function (v) {
                    escapedParameters.push(v);
                    return _this.createParameter(key, escapedParameters.length - 1);
                }).join(", ");
            }
            if (value instanceof Function) {
                return value();
            }
            if (value instanceof Date) {
                return DateUtils_1.DateUtils.mixedDateToDatetimeString(value, true);
            }
            escapedParameters.push(value);
            return _this.createParameter(key, escapedParameters.length - 1);
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    };
    /**
     * Escapes a column name.
     */
    SapDriver.prototype.escape = function (columnName) {
        return "\"".concat(columnName, "\"");
    };
    /**
     * Build full table name with schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    SapDriver.prototype.buildTableName = function (tableName, schema) {
        var tablePath = [tableName];
        if (schema) {
            tablePath.unshift(schema);
        }
        return tablePath.join(".");
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    SapDriver.prototype.parseTableName = function (target) {
        var driverDatabase = this.database;
        var driverSchema = this.schema;
        if (target instanceof __1.Table || target instanceof View_1.View) {
            var parsed = this.parseTableName(target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof __1.TableForeignKey) {
            var parsed = this.parseTableName(target.referencedTableName);
            return {
                database: target.referencedDatabase || parsed.database || driverDatabase,
                schema: target.referencedSchema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof __1.EntityMetadata) {
            // EntityMetadata tableName is never a path
            return {
                database: target.database || driverDatabase,
                schema: target.schema || driverSchema,
                tableName: target.tableName
            };
        }
        var parts = target.split(".");
        return {
            database: driverDatabase,
            schema: (parts.length > 1 ? parts[0] : undefined) || driverSchema,
            tableName: parts.length > 1 ? parts[1] : parts[0]
        };
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    SapDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils_1.DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "timestamp"
            || columnMetadata.type === Date) {
            return DateUtils_1.DateUtils.mixedDateToDatetimeString(value, true);
        }
        else if (columnMetadata.type === "seconddate") {
            return DateUtils_1.DateUtils.mixedDateToDatetimeString(value, false);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            return DateUtils_1.DateUtils.simpleEnumToString(value);
        }
        else if (columnMetadata.isArray) {
            return function () { return "ARRAY(".concat(value.map(function (it) { return "'".concat(it, "'"); }), ")"); };
        }
        return value;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    SapDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean) {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "timestamp"
            || columnMetadata.type === "seconddate"
            || columnMetadata.type === Date) {
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils_1.DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils_1.DateUtils.stringToSimpleJson(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            value = DateUtils_1.DateUtils.stringToSimpleEnum(value, columnMetadata);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    };
    /**
     * Creates a database type from a given column metadata.
     */
    SapDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === "int") {
            return "integer";
        }
        else if (column.type === String) {
            return "nvarchar";
        }
        else if (column.type === Date) {
            return "timestamp";
        }
        else if (column.type === Boolean) {
            return "boolean";
        }
        else if (column.type === Buffer) {
            return "blob";
        }
        else if (column.type === "uuid") {
            return "nvarchar";
        }
        else if (column.type === "simple-array" || column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "nvarchar";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    SapDriver.prototype.normalizeDefault = function (columnMetadata) {
        var defaultValue = columnMetadata.default;
        if (typeof defaultValue === "number") {
            return "".concat(defaultValue);
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "true" : "false";
        }
        if (typeof defaultValue === "function") {
            return defaultValue();
        }
        if (typeof defaultValue === "string") {
            return "'".concat(defaultValue, "'");
        }
        if (defaultValue === null || defaultValue === undefined) {
            return undefined;
        }
        return "".concat(defaultValue);
    };
    /**
     * Normalizes "isUnique" value of the column.
     */
    SapDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.indices.some(function (idx) { return idx.isUnique && idx.columns.length === 1 && idx.columns[0] === column; });
    };
    /**
     * Returns default column lengths, which is required on column creation.
     */
    SapDriver.prototype.getColumnLength = function (column) {
        if (column.length)
            return column.length.toString();
        if (column.generationStrategy === "uuid")
            return "36";
        switch (column.type) {
            case "varchar":
            case "nvarchar":
            case "shorttext":
            case String:
                return "255";
            case "alphanum":
                return "127";
            case "varbinary":
                return "255";
        }
        return "";
    };
    /**
     * Creates column type definition including length, precision and scale
     */
    SapDriver.prototype.createFullType = function (column) {
        var type = column.type;
        // used 'getColumnLength()' method, because SqlServer sets `varchar` and `nvarchar` length to 1 by default.
        if (this.getColumnLength(column)) {
            type += "(".concat(this.getColumnLength(column), ")");
        }
        else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += "(".concat(column.precision, ",").concat(column.scale, ")");
        }
        else if (column.precision !== null && column.precision !== undefined) {
            type += "(".concat(column.precision, ")");
        }
        if (column.isArray)
            type += " array";
        return type;
    };
    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    SapDriver.prototype.obtainMasterConnection = function () {
        if (!this.master) {
            throw new __1.TypeORMError("Driver not Connected");
        }
        return this.master.getConnection();
    };
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    SapDriver.prototype.obtainSlaveConnection = function () {
        return this.obtainMasterConnection();
    };
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    SapDriver.prototype.createGeneratedMap = function (metadata, insertResult) {
        var generatedMap = metadata.generatedColumns.reduce(function (map, generatedColumn) {
            var value;
            if (generatedColumn.generationStrategy === "increment" && insertResult) {
                value = insertResult;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     console.log("getting db value:", generatedColumn.databaseName);
                //     value = generatedColumn.getEntityValue(uuidMap);
            }
            return OrmUtils_1.OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {});
        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    };
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    SapDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, _this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, _this.getColumnLength(columnMetadata));
            // console.log("width:", tableColumn.width, columnMetadata.width);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("default:", tableColumn.default, columnMetadata.default);
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, _this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log((columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated));
            // console.log("==========================================");
            var normalizeDefault = _this.normalizeDefault(columnMetadata);
            var hanaNullComapatibleDefault = normalizeDefault == null ? undefined : normalizeDefault;
            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || columnMetadata.length && tableColumn.length !== _this.getColumnLength(columnMetadata)
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                // || tableColumn.comment !== columnMetadata.comment || // todo
                || (!tableColumn.isGenerated && (hanaNullComapatibleDefault !== tableColumn.default)) // we included check for generated here, because generated columns already can have default values
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== _this.normalizeIsUnique(columnMetadata)
                || (columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated);
        });
    };
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    SapDriver.prototype.isReturningSqlSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    SapDriver.prototype.isUUIDGenerationSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    SapDriver.prototype.isFullTextColumnTypeSupported = function () {
        return true;
    };
    /**
     * Creates an escaped parameter.
     */
    SapDriver.prototype.createParameter = function (parameterName, index) {
        return "?";
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    SapDriver.prototype.loadDependencies = function () {
        try {
            var client = this.options.driver || PlatformTools_1.PlatformTools.load("hdb-pool");
            this.client = client;
        }
        catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("SAP Hana", "hdb-pool");
        }
        try {
            if (!this.options.hanaClientDriver) {
                PlatformTools_1.PlatformTools.load("@sap/hana-client");
            }
        }
        catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("SAP Hana", "@sap/hana-client");
        }
    };
    return SapDriver;
}());
exports.SapDriver = SapDriver;

//# sourceMappingURL=SapDriver.js.map
