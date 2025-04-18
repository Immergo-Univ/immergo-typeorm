"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractSqliteDriver = void 0;
var tslib_1 = require("tslib");
var DateUtils_1 = require("../../util/DateUtils");
var RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
var EntityMetadata_1 = require("../../metadata/EntityMetadata");
var OrmUtils_1 = require("../../util/OrmUtils");
var ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
var DriverUtils_1 = require("../DriverUtils");
var error_1 = require("../../error");
var Table_1 = require("../../schema-builder/table/Table");
var View_1 = require("../../schema-builder/view/View");
var TableForeignKey_1 = require("../../schema-builder/table/TableForeignKey");
/**
 * Organizes communication with sqlite DBMS.
 */
var AbstractSqliteDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function AbstractSqliteDriver(connection) {
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
        this.transactionSupport = "nested";
        /**
         * Gets list of supported column data types by a driver.
         *
         * @see https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm
         * @see https://sqlite.org/datatype3.html
         */
        this.supportedDataTypes = [
            "int",
            "integer",
            "tinyint",
            "smallint",
            "mediumint",
            "bigint",
            "unsigned big int",
            "int2",
            "int8",
            "integer",
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "clob",
            "text",
            "blob",
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "boolean",
            "date",
            "time",
            "datetime"
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertType = "on-conflict-do-update";
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "blob",
            "clob"
        ];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "date",
            "time",
            "datetime"
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "datetime",
            createDateDefault: "datetime('now')",
            updateDate: "datetime",
            updateDateDefault: "datetime('now')",
            deleteDate: "datetime",
            deleteDateNullable: true,
            version: "integer",
            treeLevel: "integer",
            migrationId: "integer",
            migrationName: "varchar",
            migrationTimestamp: "bigint",
            cacheId: "int",
            cacheIdentifier: "varchar",
            cacheTime: "bigint",
            cacheDuration: "int",
            cacheQuery: "text",
            cacheResult: "text",
            metadataType: "varchar",
            metadataDatabase: "varchar",
            metadataSchema: "varchar",
            metadataTable: "varchar",
            metadataName: "varchar",
            metadataValue: "text",
        };
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        /**
         * Any attached databases (excepting default 'main')
         */
        this.attachedDatabases = {};
        this.connection = connection;
        this.options = connection.options;
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).database;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    AbstractSqliteDriver.prototype.connect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.createDatabaseConnection()];
                    case 1:
                        _a.databaseConnection = _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    AbstractSqliteDriver.prototype.afterConnect = function () {
        return Promise.resolve();
    };
    /**
     * Closes connection with database.
     */
    AbstractSqliteDriver.prototype.disconnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/, new Promise(function (ok, fail) {
                        _this.queryRunner = undefined;
                        _this.databaseConnection.close(function (err) { return err ? fail(err) : ok(); });
                    })];
            });
        });
    };
    AbstractSqliteDriver.prototype.hasAttachedDatabases = function () {
        return !!Object.keys(this.attachedDatabases).length;
    };
    AbstractSqliteDriver.prototype.getAttachedDatabaseHandleByRelativePath = function (path) {
        var _a, _b;
        return (_b = (_a = this.attachedDatabases) === null || _a === void 0 ? void 0 : _a[path]) === null || _b === void 0 ? void 0 : _b.attachHandle;
    };
    AbstractSqliteDriver.prototype.getAttachedDatabasePathRelativeByHandle = function (handle) {
        var _a;
        return (_a = Object.values(this.attachedDatabases).find(function (_a) {
            var attachHandle = _a.attachHandle;
            return handle === attachHandle;
        })) === null || _a === void 0 ? void 0 : _a.attachFilepathRelative;
    };
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    AbstractSqliteDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    AbstractSqliteDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean || columnMetadata.type === "boolean") {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils_1.DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            // to string conversation needs because SQLite stores date as integer number, when date came as Object
            // TODO: think about `toUTC` conversion
            return DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(value);
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
        return value;
    };
    /**
     * Prepares given value to a value to be hydrated, based on its column type or metadata.
     */
    AbstractSqliteDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean || columnMetadata.type === "boolean") {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            /**
             * Fix date conversion issue
             *
             * If the format of the date string is "2018-03-14 02:33:33.906", Safari (and iOS WKWebView) will convert it to an invalid date object.
             * We need to modify the date string to "2018-03-14T02:33:33.906Z" and Safari will convert it correctly.
             *
             * ISO 8601
             * https://www.w3.org/TR/NOTE-datetime
             */
            if (value && typeof value === "string") {
                // There are various valid time string formats a sqlite time string might have:
                // https://www.sqlite.org/lang_datefunc.html
                // There are two separate fixes we may need to do:
                //   1) Add 'T' separator if space is used instead
                //   2) Add 'Z' UTC suffix if no timezone or offset specified
                if (/^\d\d\d\d-\d\d-\d\d \d\d:\d\d/.test(value)) {
                    value = value.replace(" ", "T");
                }
                if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d\d\d)?)?$/.test(value)) {
                    value += "Z";
                }
            }
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
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    AbstractSqliteDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
        var _this = this;
        var escapedParameters = Object.keys(nativeParameters).map(function (key) {
            // Mapping boolean values to their numeric representation
            if (typeof nativeParameters[key] === "boolean") {
                return nativeParameters[key] === true ? 1 : 0;
            }
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
            escapedParameters.push(value);
            return _this.createParameter(key, escapedParameters.length - 1);
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    };
    /**
     * Escapes a column name.
     */
    AbstractSqliteDriver.prototype.escape = function (columnName) {
        return "\"" + columnName + "\"";
    };
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     *
     * Returns only simple table name because all inherited drivers does not supports schema and database.
     */
    AbstractSqliteDriver.prototype.buildTableName = function (tableName, schema, database) {
        return tableName;
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    AbstractSqliteDriver.prototype.parseTableName = function (target) {
        var _a;
        var driverDatabase = this.database;
        var driverSchema = undefined;
        if (target instanceof Table_1.Table || target instanceof View_1.View) {
            var parsed = this.parseTableName(target.schema ? "\"".concat(target.schema, "\".\"").concat(target.name, "\"") : target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName,
            };
        }
        if (target instanceof TableForeignKey_1.TableForeignKey) {
            var parsed = this.parseTableName(target.referencedTableName);
            return {
                database: target.referencedDatabase || parsed.database || driverDatabase,
                schema: target.referencedSchema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof EntityMetadata_1.EntityMetadata) {
            // EntityMetadata tableName is never a path
            return {
                database: target.database || driverDatabase,
                schema: target.schema || driverSchema,
                tableName: target.tableName
            };
        }
        var parts = target.split(".");
        if (parts.length === 3) {
            return {
                database: parts[0] || driverDatabase,
                schema: parts[1] || driverSchema,
                tableName: parts[2]
            };
        }
        else if (parts.length === 2) {
            var database = (_a = this.getAttachedDatabasePathRelativeByHandle(parts[0])) !== null && _a !== void 0 ? _a : driverDatabase;
            return {
                database: database,
                schema: parts[0],
                tableName: parts[1]
            };
        }
        else {
            return {
                database: driverDatabase,
                schema: driverSchema,
                tableName: target
            };
        }
    };
    /**
     * Creates a database type from a given column metadata.
     */
    AbstractSqliteDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === "int") {
            return "integer";
        }
        else if (column.type === String) {
            return "varchar";
        }
        else if (column.type === Date) {
            return "datetime";
        }
        else if (column.type === Boolean) {
            return "boolean";
        }
        else if (column.type === "uuid") {
            return "varchar";
        }
        else if (column.type === "simple-array") {
            return "text";
        }
        else if (column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "varchar";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    AbstractSqliteDriver.prototype.normalizeDefault = function (columnMetadata) {
        var defaultValue = columnMetadata.default;
        if (typeof defaultValue === "number") {
            return "" + defaultValue;
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "1" : "0";
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
    AbstractSqliteDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.uniques.some(function (uq) { return uq.columns.length === 1 && uq.columns[0] === column; });
    };
    /**
     * Calculates column length taking into account the default length values.
     */
    AbstractSqliteDriver.prototype.getColumnLength = function (column) {
        return column.length ? column.length.toString() : "";
    };
    /**
     * Normalizes "default" value of the column.
     */
    AbstractSqliteDriver.prototype.createFullType = function (column) {
        var type = column.type;
        if (column.enum) {
            return "varchar";
        }
        if (column.length) {
            type += "(" + column.length + ")";
        }
        else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += "(" + column.precision + "," + column.scale + ")";
        }
        else if (column.precision !== null && column.precision !== undefined) {
            type += "(" + column.precision + ")";
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
    AbstractSqliteDriver.prototype.obtainMasterConnection = function () {
        return Promise.resolve();
    };
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    AbstractSqliteDriver.prototype.obtainSlaveConnection = function () {
        return Promise.resolve();
    };
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    AbstractSqliteDriver.prototype.createGeneratedMap = function (metadata, insertResult, entityIndex, entityNum) {
        var generatedMap = metadata.generatedColumns.reduce(function (map, generatedColumn) {
            var value;
            if (generatedColumn.generationStrategy === "increment" && insertResult) {
                // NOTE: When INSERT statement is successfully completed, the last inserted row ID is returned.
                // see also: SqliteQueryRunner.query()
                value = insertResult - entityNum + entityIndex + 1;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     value = insertValue[generatedColumn.databaseName];
            }
            if (!value)
                return map;
            return OrmUtils_1.OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {});
        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    };
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    AbstractSqliteDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, columnMetadata.length);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("comment:", tableColumn.comment, columnMetadata.comment);
            // console.log("default:", this.normalizeDefault(columnMetadata), columnMetadata.default);
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log("==========================================");
            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                //  || tableColumn.comment !== columnMetadata.comment || // todo
                || _this.normalizeDefault(columnMetadata) !== tableColumn.default
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== _this.normalizeIsUnique(columnMetadata)
                || (columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated);
        });
    };
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    AbstractSqliteDriver.prototype.isReturningSqlSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    AbstractSqliteDriver.prototype.isUUIDGenerationSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    AbstractSqliteDriver.prototype.isFullTextColumnTypeSupported = function () {
        return false;
    };
    /**
     * Creates an escaped parameter.
     */
    AbstractSqliteDriver.prototype.createParameter = function (parameterName, index) {
        // return "$" + (index + 1);
        return "?";
        // return "$" + parameterName;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    AbstractSqliteDriver.prototype.createDatabaseConnection = function () {
        throw new error_1.TypeORMError("Do not use AbstractSqlite directly, it has to be used with one of the sqlite drivers");
    };
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    AbstractSqliteDriver.prototype.loadDependencies = function () {
        // dependencies have to be loaded in the specific driver
    };
    return AbstractSqliteDriver;
}());
exports.AbstractSqliteDriver = AbstractSqliteDriver;

//# sourceMappingURL=AbstractSqliteDriver.js.map
