"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleDriver = void 0;
var tslib_1 = require("tslib");
var ConnectionIsNotSetError_1 = require("../../error/ConnectionIsNotSetError");
var DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
var OracleQueryRunner_1 = require("./OracleQueryRunner");
var DateUtils_1 = require("../../util/DateUtils");
var PlatformTools_1 = require("../../platform/PlatformTools");
var RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
var DriverUtils_1 = require("../DriverUtils");
var EntityMetadata_1 = require("../../metadata/EntityMetadata");
var OrmUtils_1 = require("../../util/OrmUtils");
var ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
var Table_1 = require("../../schema-builder/table/Table");
var View_1 = require("../../schema-builder/view/View");
var TableForeignKey_1 = require("../../schema-builder/table/TableForeignKey");
var error_1 = require("../../error");
/**
 * Organizes communication with Oracle RDBMS.
 */
var OracleDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function OracleDriver(connection) {
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
        this.transactionSupport = "nested";
        /**
         * Gets list of supported column data types by a driver.
         *
         * @see https://www.techonthenet.com/oracle/datatypes.php
         * @see https://docs.oracle.com/cd/B28359_01/server.111/b28318/datatype.htm#CNCPT012
         */
        this.supportedDataTypes = [
            "char",
            "nchar",
            "nvarchar2",
            "varchar2",
            "long",
            "raw",
            "long raw",
            "number",
            "numeric",
            "float",
            "dec",
            "decimal",
            "integer",
            "int",
            "smallint",
            "real",
            "double precision",
            "date",
            "timestamp",
            "timestamp with time zone",
            "timestamp with local time zone",
            "interval year to month",
            "interval day to second",
            "bfile",
            "blob",
            "clob",
            "nclob",
            "rowid",
            "urowid"
        ];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "char",
            "nchar",
            "nvarchar2",
            "varchar2",
            "varchar",
            "raw"
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "number",
            "float",
            "timestamp",
            "timestamp with time zone",
            "timestamp with local time zone"
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "number"
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
            version: "number",
            treeLevel: "number",
            migrationId: "number",
            migrationName: "varchar2",
            migrationTimestamp: "number",
            cacheId: "number",
            cacheIdentifier: "varchar2",
            cacheTime: "number",
            cacheDuration: "number",
            cacheQuery: "clob",
            cacheResult: "clob",
            metadataType: "varchar2",
            metadataDatabase: "varchar2",
            metadataSchema: "varchar2",
            metadataTable: "varchar2",
            metadataName: "varchar2",
            metadataValue: "clob",
        };
        /**
         * Default values of length, precision and scale depends on column data type.
         * Used in the cases when length/precision/scale is not specified by user.
         */
        this.dataTypeDefaults = {
            "char": { length: 1 },
            "nchar": { length: 1 },
            "varchar": { length: 255 },
            "varchar2": { length: 255 },
            "nvarchar2": { length: 255 },
            "raw": { length: 2000 },
            "float": { precision: 126 },
            "timestamp": { precision: 6 },
            "timestamp with time zone": { precision: 6 },
            "timestamp with local time zone": { precision: 6 }
        };
        /**
         * Max length allowed by Oracle for aliases.
         * @see https://docs.oracle.com/database/121/SQLRF/sql_elements008.htm#SQLRF51129
         * > The following list of rules applies to both quoted and nonquoted identifiers unless otherwise indicated
         * > Names must be from 1 to 30 bytes long with these exceptions:
         * > [...]
         *
         * Since Oracle 12.2 (with a compatible driver/client), the limit has been set to 128.
         * @see https://docs.oracle.com/en/database/oracle/oracle-database/12.2/sqlrf/Database-Object-Names-and-Qualifiers.html
         *
         * > If COMPATIBLE is set to a value of 12.2 or higher, then names must be from 1 to 128 bytes long with these exceptions
         */
        this.maxAliasLength = 30;
        this.connection = connection;
        this.options = connection.options;
        if (this.options.useUTC === true) {
            process.env.ORA_SDTZ = "UTC";
        }
        // load oracle package
        this.loadDependencies();
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options.replication ? this.options.replication.master : this.options).database;
        this.schema = DriverUtils_1.DriverUtils.buildDriverOptions(this.options).schema;
        // Object.assign(connection.options, DriverUtils.buildDriverOptions(connection.options)); // todo: do it better way
        // validate options to make sure everything is set
        // if (!this.options.host)
        //     throw new DriverOptionNotSetError("host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.sid)
        //     throw new DriverOptionNotSetError("sid");
        //
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    OracleDriver.prototype.connect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a, _b, _c, queryRunner, _d, _e;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.oracle.fetchAsString = [this.oracle.CLOB];
                        this.oracle.fetchAsBuffer = [this.oracle.BLOB];
                        if (!this.options.replication) return [3 /*break*/, 3];
                        _a = this;
                        return [4 /*yield*/, Promise.all(this.options.replication.slaves.map(function (slave) {
                                return _this.createPool(_this.options, slave);
                            }))];
                    case 1:
                        _a.slaves = _f.sent();
                        _b = this;
                        return [4 /*yield*/, this.createPool(this.options, this.options.replication.master)];
                    case 2:
                        _b.master = _f.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        _c = this;
                        return [4 /*yield*/, this.createPool(this.options, this.options)];
                    case 4:
                        _c.master = _f.sent();
                        _f.label = 5;
                    case 5:
                        if (!(!this.database || !this.schema)) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.createQueryRunner("master")];
                    case 6:
                        queryRunner = _f.sent();
                        if (!!this.database) return [3 /*break*/, 8];
                        _d = this;
                        return [4 /*yield*/, queryRunner.getCurrentDatabase()];
                    case 7:
                        _d.database = _f.sent();
                        _f.label = 8;
                    case 8:
                        if (!!this.schema) return [3 /*break*/, 10];
                        _e = this;
                        return [4 /*yield*/, queryRunner.getCurrentSchema()];
                    case 9:
                        _e.schema = _f.sent();
                        _f.label = 10;
                    case 10: return [4 /*yield*/, queryRunner.release()];
                    case 11:
                        _f.sent();
                        _f.label = 12;
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    OracleDriver.prototype.afterConnect = function () {
        return Promise.resolve();
    };
    /**
     * Closes connection with the database.
     */
    OracleDriver.prototype.disconnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.master)
                            return [2 /*return*/, Promise.reject(new ConnectionIsNotSetError_1.ConnectionIsNotSetError("oracle"))];
                        return [4 /*yield*/, this.closePool(this.master)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, Promise.all(this.slaves.map(function (slave) { return _this.closePool(slave); }))];
                    case 2:
                        _a.sent();
                        this.master = undefined;
                        this.slaves = [];
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    OracleDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    OracleDriver.prototype.createQueryRunner = function (mode) {
        return new OracleQueryRunner_1.OracleQueryRunner(this, mode);
    };
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    OracleDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
        var _this = this;
        var escapedParameters = Object.keys(nativeParameters).map(function (key) {
            if (typeof nativeParameters[key] === "boolean")
                return nativeParameters[key] ? 1 : 0;
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
            if (typeof value === "boolean") {
                return value ? "1" : "0";
            }
            escapedParameters.push(value);
            return _this.createParameter(key, escapedParameters.length - 1);
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    };
    /**
     * Escapes a column name.
     */
    OracleDriver.prototype.escape = function (columnName) {
        return "\"".concat(columnName, "\"");
    };
    /**
     * Build full table name with database name, schema name and table name.
     * Oracle does not support table schemas. One user can have only one schema.
     */
    OracleDriver.prototype.buildTableName = function (tableName, schema, database) {
        var tablePath = [tableName];
        if (schema) {
            tablePath.unshift(schema);
        }
        return tablePath.join(".");
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    OracleDriver.prototype.parseTableName = function (target) {
        var driverDatabase = this.database;
        var driverSchema = this.schema;
        if (target instanceof Table_1.Table || target instanceof View_1.View) {
            var parsed = this.parseTableName(target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName
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
            return {
                database: driverDatabase,
                schema: parts[0] || driverSchema,
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
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    OracleDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean) {
            return value ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            if (typeof value === "string")
                value = value.replace(/[^0-9-]/g, "");
            return function () { return "TO_DATE('".concat(DateUtils_1.DateUtils.mixedDateToDateString(value), "', 'YYYY-MM-DD')"); };
        }
        else if (columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp with local time zone") {
            return DateUtils_1.DateUtils.mixedDateToDate(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        return value;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    OracleDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean) {
            value = !!value;
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils_1.DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp with local time zone") {
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "json") {
            value = JSON.parse(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils_1.DateUtils.stringToSimpleJson(value);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    };
    /**
     * Creates a database type from a given column metadata.
     */
    OracleDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === Boolean || column.type === "numeric"
            || column.type === "dec" || column.type === "decimal" || column.type === "int"
            || column.type === "integer" || column.type === "smallint") {
            return "number";
        }
        else if (column.type === "real" || column.type === "double precision") {
            return "float";
        }
        else if (column.type === String || column.type === "varchar") {
            return "varchar2";
        }
        else if (column.type === Date) {
            return "timestamp";
        }
        else if (column.type === Buffer) {
            return "blob";
        }
        else if (column.type === "uuid") {
            return "varchar2";
        }
        else if (column.type === "simple-array") {
            return "clob";
        }
        else if (column.type === "simple-json") {
            return "clob";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    OracleDriver.prototype.normalizeDefault = function (columnMetadata) {
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
    OracleDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.uniques.some(function (uq) { return uq.columns.length === 1 && uq.columns[0] === column; });
    };
    /**
     * Calculates column length taking into account the default length values.
     */
    OracleDriver.prototype.getColumnLength = function (column) {
        if (column.length)
            return column.length.toString();
        switch (column.type) {
            case String:
            case "varchar":
            case "varchar2":
            case "nvarchar2":
                return "255";
            case "raw":
                return "2000";
            case "uuid":
                return "36";
            default:
                return "";
        }
    };
    OracleDriver.prototype.createFullType = function (column) {
        var type = column.type;
        // used 'getColumnLength()' method, because in Oracle column length is required for some data types.
        if (this.getColumnLength(column)) {
            type += "(".concat(this.getColumnLength(column), ")");
        }
        else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += "(" + column.precision + "," + column.scale + ")";
        }
        else if (column.precision !== null && column.precision !== undefined) {
            type += "(" + column.precision + ")";
        }
        if (column.type === "timestamp with time zone") {
            type = "TIMESTAMP" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "") + " WITH TIME ZONE";
        }
        else if (column.type === "timestamp with local time zone") {
            type = "TIMESTAMP" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "") + " WITH LOCAL TIME ZONE";
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
    OracleDriver.prototype.obtainMasterConnection = function () {
        var _this = this;
        return new Promise(function (ok, fail) {
            if (!_this.master) {
                return fail(new error_1.TypeORMError("Driver not Connected"));
            }
            _this.master.getConnection(function (err, connection, release) {
                if (err)
                    return fail(err);
                ok(connection);
            });
        });
    };
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    OracleDriver.prototype.obtainSlaveConnection = function () {
        var _this = this;
        if (!this.slaves.length)
            return this.obtainMasterConnection();
        return new Promise(function (ok, fail) {
            var random = Math.floor(Math.random() * _this.slaves.length);
            _this.slaves[random].getConnection(function (err, connection) {
                if (err)
                    return fail(err);
                ok(connection);
            });
        });
    };
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    OracleDriver.prototype.createGeneratedMap = function (metadata, insertResult) {
        var _this = this;
        if (!insertResult)
            return undefined;
        return Object.keys(insertResult).reduce(function (map, key) {
            var column = metadata.findColumnWithDatabaseName(key);
            if (column) {
                OrmUtils_1.OrmUtils.mergeDeep(map, column.createValueMap(_this.prepareHydratedValue(insertResult[key], column)));
            }
            return map;
        }, {});
    };
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    OracleDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            var isColumnChanged = tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || tableColumn.length !== _this.getColumnLength(columnMetadata)
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                // || tableColumn.comment !== columnMetadata.comment
                || tableColumn.default !== _this.normalizeDefault(columnMetadata)
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== _this.normalizeIsUnique(columnMetadata)
                || (columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated);
            // DEBUG SECTION
            // if (isColumnChanged) {
            //     console.log("table:", columnMetadata.entityMetadata.tableName);
            //     console.log("name:", tableColumn.name, columnMetadata.databaseName);
            //     console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            //     console.log("length:", tableColumn.length, columnMetadata.length);
            //     console.log("precision:", tableColumn.precision, columnMetadata.precision);
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale);
            //     console.log("comment:", tableColumn.comment, columnMetadata.comment);
            //     console.log("default:", tableColumn.default, this.normalizeDefault(columnMetadata));
            //     console.log("enum:", tableColumn.enum && columnMetadata.enum && !OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map(val => val + "")));
            //     console.log("onUpdate:", tableColumn.onUpdate, columnMetadata.onUpdate);
            //     console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            //     console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            //     console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            //     console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            //     console.log("==========================================");
            // }
            return isColumnChanged;
        });
    };
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    OracleDriver.prototype.isReturningSqlSupported = function () {
        return true;
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    OracleDriver.prototype.isUUIDGenerationSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    OracleDriver.prototype.isFullTextColumnTypeSupported = function () {
        return false;
    };
    /**
     * Creates an escaped parameter.
     */
    OracleDriver.prototype.createParameter = function (parameterName, index) {
        return ":" + (index + 1);
    };
    /**
     * Converts column type in to native oracle type.
     */
    OracleDriver.prototype.columnTypeToNativeParameter = function (type) {
        switch (this.normalizeType({ type: type })) {
            case "number":
            case "numeric":
            case "int":
            case "integer":
            case "smallint":
            case "dec":
            case "decimal":
                return this.oracle.NUMBER;
            case "char":
            case "nchar":
            case "nvarchar2":
            case "varchar2":
                return this.oracle.STRING;
            case "blob":
                return this.oracle.BLOB;
            case "clob":
                return this.oracle.CLOB;
            case "date":
            case "timestamp":
            case "timestamp with time zone":
            case "timestamp with local time zone":
                return this.oracle.DATE;
        }
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Loads all driver dependencies.
     */
    OracleDriver.prototype.loadDependencies = function () {
        try {
            var oracle = this.options.driver || PlatformTools_1.PlatformTools.load("oracledb");
            this.oracle = oracle;
        }
        catch (e) {
            throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("Oracle", "oracledb");
        }
    };
    /**
     * Creates a new connection pool for a given database credentials.
     */
    OracleDriver.prototype.createPool = function (options, credentials) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var address, connectData, connectString, connectionOptions;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                credentials = Object.assign({}, credentials, DriverUtils_1.DriverUtils.buildDriverOptions(credentials)); // todo: do it better way
                if (!credentials.connectString) {
                    address = "(PROTOCOL=TCP)";
                    if (credentials.host) {
                        address += "(HOST=".concat(credentials.host, ")");
                    }
                    if (credentials.port) {
                        address += "(PORT=".concat(credentials.port, ")");
                    }
                    connectData = "(SERVER=DEDICATED)";
                    if (credentials.sid) {
                        connectData += "(SID=".concat(credentials.sid, ")");
                    }
                    if (credentials.serviceName) {
                        connectData += "(SERVICE_NAME=".concat(credentials.serviceName, ")");
                    }
                    connectString = "(DESCRIPTION=(ADDRESS=".concat(address, ")(CONNECT_DATA=").concat(connectData, "))");
                    Object.assign(credentials, { connectString: connectString });
                }
                connectionOptions = Object.assign({}, {
                    user: credentials.username,
                    password: credentials.password,
                    connectString: credentials.connectString,
                }, options.extra || {});
                // pooling is enabled either when its set explicitly to true,
                // either when its not defined at all (e.g. enabled by default)
                return [2 /*return*/, new Promise(function (ok, fail) {
                        _this.oracle.createPool(connectionOptions, function (err, pool) {
                            if (err)
                                return fail(err);
                            ok(pool);
                        });
                    })];
            });
        });
    };
    /**
     * Closes connection pool.
     */
    OracleDriver.prototype.closePool = function (pool) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/, new Promise(function (ok, fail) {
                        pool.close(function (err) { return err ? fail(err) : ok(); });
                        pool = undefined;
                    })];
            });
        });
    };
    return OracleDriver;
}());
exports.OracleDriver = OracleDriver;

//# sourceMappingURL=OracleDriver.js.map
