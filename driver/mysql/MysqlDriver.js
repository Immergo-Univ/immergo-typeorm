"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlDriver = void 0;
var tslib_1 = require("tslib");
var ConnectionIsNotSetError_1 = require("../../error/ConnectionIsNotSetError");
var DriverPackageNotInstalledError_1 = require("../../error/DriverPackageNotInstalledError");
var DriverUtils_1 = require("../DriverUtils");
var MysqlQueryRunner_1 = require("./MysqlQueryRunner");
var DateUtils_1 = require("../../util/DateUtils");
var PlatformTools_1 = require("../../platform/PlatformTools");
var RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
var EntityMetadata_1 = require("../../metadata/EntityMetadata");
var OrmUtils_1 = require("../../util/OrmUtils");
var ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
var error_1 = require("../../error");
var Table_1 = require("../../schema-builder/table/Table");
var View_1 = require("../../schema-builder/view/View");
var TableForeignKey_1 = require("../../schema-builder/table/TableForeignKey");
var VersionUtils_1 = require("../../util/VersionUtils");
/**
 * Organizes communication with MySQL DBMS.
 */
var MysqlDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function MysqlDriver(connection) {
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
         * @see https://www.tutorialspoint.com/mysql/mysql-data-types.htm
         * @see https://dev.mysql.com/doc/refman/8.0/en/data-types.html
         */
        this.supportedDataTypes = [
            // numeric types
            "bit",
            "int",
            "integer",
            "tinyint",
            "smallint",
            "mediumint",
            "bigint",
            "float",
            "double",
            "double precision",
            "real",
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "bool",
            "boolean",
            // date and time types
            "date",
            "datetime",
            "timestamp",
            "time",
            "year",
            // string types
            "char",
            "nchar",
            "national char",
            "varchar",
            "nvarchar",
            "national varchar",
            "blob",
            "text",
            "tinyblob",
            "tinytext",
            "mediumblob",
            "mediumtext",
            "longblob",
            "longtext",
            "enum",
            "set",
            "binary",
            "varbinary",
            // json data type
            "json",
            // spatial data types
            "geometry",
            "point",
            "linestring",
            "polygon",
            "multipoint",
            "multilinestring",
            "multipolygon",
            "geometrycollection"
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertType = "on-duplicate-key-update";
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [
            "geometry",
            "point",
            "linestring",
            "polygon",
            "multipoint",
            "multilinestring",
            "multipolygon",
            "geometrycollection"
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "char",
            "varchar",
            "nvarchar",
            "binary",
            "varbinary"
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withWidthColumnTypes = [
            "bit",
            "tinyint",
            "smallint",
            "mediumint",
            "int",
            "integer",
            "bigint"
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real",
            "time",
            "datetime",
            "timestamp"
        ];
        /**
         * Gets list of column data types that supports scale by a driver.
         */
        this.withScaleColumnTypes = [
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real"
        ];
        /**
         * Gets list of column data types that supports UNSIGNED and ZEROFILL attributes.
         */
        this.unsignedAndZerofillTypes = [
            "int",
            "integer",
            "smallint",
            "tinyint",
            "mediumint",
            "bigint",
            "decimal",
            "dec",
            "numeric",
            "fixed",
            "float",
            "double",
            "double precision",
            "real"
        ];
        /**
         * ORM has special columns and we need to know what database column types should be for those columns.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "datetime",
            createDatePrecision: 6,
            createDateDefault: "CURRENT_TIMESTAMP(6)",
            updateDate: "datetime",
            updateDatePrecision: 6,
            updateDateDefault: "CURRENT_TIMESTAMP(6)",
            deleteDate: "datetime",
            deleteDatePrecision: 6,
            deleteDateNullable: true,
            version: "int",
            treeLevel: "int",
            migrationId: "int",
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
        /**
         * Default values of length, precision and scale depends on column data type.
         * Used in the cases when length/precision/scale is not specified by user.
         */
        this.dataTypeDefaults = {
            "varchar": { length: 255 },
            "nvarchar": { length: 255 },
            "national varchar": { length: 255 },
            "char": { length: 1 },
            "binary": { length: 1 },
            "varbinary": { length: 255 },
            "decimal": { precision: 10, scale: 0 },
            "dec": { precision: 10, scale: 0 },
            "numeric": { precision: 10, scale: 0 },
            "fixed": { precision: 10, scale: 0 },
            "float": { precision: 12 },
            "double": { precision: 22 },
            "time": { precision: 0 },
            "datetime": { precision: 0 },
            "timestamp": { precision: 0 },
            "bit": { width: 1 },
            "int": { width: 11 },
            "integer": { width: 11 },
            "tinyint": { width: 4 },
            "smallint": { width: 6 },
            "mediumint": { width: 9 },
            "bigint": { width: 20 }
        };
        /**
         * Max length allowed by MySQL for aliases.
         * @see https://dev.mysql.com/doc/refman/5.5/en/identifiers.html
         */
        this.maxAliasLength = 63;
        /**
         * Supported returning types
         */
        this._isReturningSqlSupported = {
            delete: false,
            insert: false,
            update: false,
        };
        this.connection = connection;
        this.options = (0, tslib_1.__assign)({ legacySpatialSupport: true }, connection.options);
        this.isReplicated = this.options.replication ? true : false;
        // load mysql package
        this.loadDependencies();
        this.database = DriverUtils_1.DriverUtils.buildDriverOptions(this.options.replication ? this.options.replication.master : this.options).database;
        // validate options to make sure everything is set
        // todo: revisit validation with replication in mind
        // if (!(this.options.host || (this.options.extra && this.options.extra.socketPath)) && !this.options.socketPath)
        //     throw new DriverOptionNotSetError("socketPath and host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.database)
        //     throw new DriverOptionNotSetError("database");
        // todo: check what is going on when connection is setup without database and how to connect to a database then?
        // todo: provide options to auto-create a database if it does not exist yet
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    MysqlDriver.prototype.connect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a, queryRunner, _b, result, dbVersion;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.options.replication) return [3 /*break*/, 1];
                        this.poolCluster = this.mysql.createPoolCluster(this.options.replication);
                        this.options.replication.slaves.forEach(function (slave, index) {
                            _this.poolCluster.add("SLAVE" + index, _this.createConnectionOptions(_this.options, slave));
                        });
                        this.poolCluster.add("MASTER", this.createConnectionOptions(this.options, this.options.replication.master));
                        return [3 /*break*/, 3];
                    case 1:
                        _a = this;
                        return [4 /*yield*/, this.createPool(this.createConnectionOptions(this.options, this.options))];
                    case 2:
                        _a.pool = _c.sent();
                        _c.label = 3;
                    case 3:
                        if (!!this.database) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.createQueryRunner("master")];
                    case 4:
                        queryRunner = _c.sent();
                        _b = this;
                        return [4 /*yield*/, queryRunner.getCurrentDatabase()];
                    case 5:
                        _b.database = _c.sent();
                        return [4 /*yield*/, queryRunner.release()];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7:
                        if (!(this.options.type === "mariadb")) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.createQueryRunner("master")
                                .query("SELECT VERSION() AS `version`")];
                    case 8:
                        result = _c.sent();
                        dbVersion = result[0].version;
                        if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.0.5")) {
                            this._isReturningSqlSupported.delete = true;
                        }
                        if (VersionUtils_1.VersionUtils.isGreaterOrEqual(dbVersion, "10.5.0")) {
                            this._isReturningSqlSupported.insert = true;
                        }
                        _c.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    MysqlDriver.prototype.afterConnect = function () {
        return Promise.resolve();
    };
    /**
     * Closes connection with the database.
     */
    MysqlDriver.prototype.disconnect = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                if (!this.poolCluster && !this.pool)
                    return [2 /*return*/, Promise.reject(new ConnectionIsNotSetError_1.ConnectionIsNotSetError("mysql"))];
                if (this.poolCluster) {
                    return [2 /*return*/, new Promise(function (ok, fail) {
                            _this.poolCluster.end(function (err) { return err ? fail(err) : ok(); });
                            _this.poolCluster = undefined;
                        })];
                }
                if (this.pool) {
                    return [2 /*return*/, new Promise(function (ok, fail) {
                            _this.pool.end(function (err) {
                                if (err)
                                    return fail(err);
                                _this.pool = undefined;
                                ok();
                            });
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    MysqlDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    MysqlDriver.prototype.createQueryRunner = function (mode) {
        return new MysqlQueryRunner_1.MysqlQueryRunner(this, mode);
    };
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    MysqlDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
        var _this = this;
        var escapedParameters = Object.keys(nativeParameters).map(function (key) { return nativeParameters[key]; });
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
    MysqlDriver.prototype.escape = function (columnName) {
        return "`" + columnName + "`";
    };
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    MysqlDriver.prototype.buildTableName = function (tableName, schema, database) {
        var tablePath = [tableName];
        if (database) {
            tablePath.unshift(database);
        }
        return tablePath.join(".");
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    MysqlDriver.prototype.parseTableName = function (target) {
        var driverDatabase = this.database;
        var driverSchema = undefined;
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
        return {
            database: (parts.length > 1 ? parts[0] : undefined) || driverDatabase,
            schema: driverSchema,
            tableName: parts.length > 1 ? parts[1] : parts[0]
        };
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    MysqlDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
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
        else if (columnMetadata.type === "json") {
            return JSON.stringify(value);
        }
        else if (columnMetadata.type === "timestamp" || columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            return DateUtils_1.DateUtils.mixedDateToDate(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "enum" || columnMetadata.type === "simple-enum") {
            return "" + value;
        }
        else if (columnMetadata.type === "set") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        return value;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    MysqlDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean || columnMetadata.type === "bool" || columnMetadata.type === "boolean") {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "json") {
            value = typeof value === "string" ? JSON.parse(value) : value;
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
        else if ((columnMetadata.type === "enum" || columnMetadata.type === "simple-enum")
            && columnMetadata.enum
            && !isNaN(value)
            && columnMetadata.enum.indexOf(parseInt(value)) >= 0) {
            // convert to number if that exists in possible enum options
            value = parseInt(value);
        }
        else if (columnMetadata.type === "set") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    };
    /**
     * Creates a database type from a given column metadata.
     */
    MysqlDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === "integer") {
            return "int";
        }
        else if (column.type === String) {
            return "varchar";
        }
        else if (column.type === Date) {
            return "datetime";
        }
        else if (column.type === Buffer) {
            return "blob";
        }
        else if (column.type === Boolean) {
            return "tinyint";
        }
        else if (column.type === "uuid") {
            return "varchar";
        }
        else if (column.type === "json" && this.options.type === "mariadb") {
            /*
             * MariaDB implements this as a LONGTEXT rather, as the JSON data type contradicts the SQL standard,
             * and MariaDB's benchmarks indicate that performance is at least equivalent.
             *
             * @see https://mariadb.com/kb/en/json-data-type/
             */
            return "longtext";
        }
        else if (column.type === "simple-array" || column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "enum";
        }
        else if (column.type === "double precision" || column.type === "real") {
            return "double";
        }
        else if (column.type === "dec" || column.type === "numeric" || column.type === "fixed") {
            return "decimal";
        }
        else if (column.type === "bool" || column.type === "boolean") {
            return "tinyint";
        }
        else if (column.type === "nvarchar" || column.type === "national varchar") {
            return "varchar";
        }
        else if (column.type === "nchar" || column.type === "national char") {
            return "char";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    MysqlDriver.prototype.normalizeDefault = function (columnMetadata) {
        var defaultValue = columnMetadata.default;
        if (defaultValue === null) {
            return undefined;
        }
        if ((columnMetadata.type === "enum"
            || columnMetadata.type === "simple-enum"
            || typeof defaultValue === "string")
            && defaultValue !== undefined) {
            return "'".concat(defaultValue, "'");
        }
        if ((columnMetadata.type === "set") && defaultValue !== undefined) {
            return "'".concat(DateUtils_1.DateUtils.simpleArrayToString(defaultValue), "'");
        }
        if (typeof defaultValue === "number") {
            return "'".concat(defaultValue.toFixed(columnMetadata.scale), "'");
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "1" : "0";
        }
        if (typeof defaultValue === "function") {
            var value = defaultValue();
            return this.normalizeDatetimeFunction(value);
        }
        if (defaultValue === undefined) {
            return undefined;
        }
        return "".concat(defaultValue);
    };
    /**
     * Normalizes "isUnique" value of the column.
     */
    MysqlDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.indices.some(function (idx) { return idx.isUnique && idx.columns.length === 1 && idx.columns[0] === column; });
    };
    /**
     * Returns default column lengths, which is required on column creation.
     */
    MysqlDriver.prototype.getColumnLength = function (column) {
        if (column.length)
            return column.length.toString();
        /**
         * fix https://github.com/typeorm/typeorm/issues/1139
         */
        if (column.generationStrategy === "uuid")
            return "36";
        switch (column.type) {
            case String:
            case "varchar":
            case "nvarchar":
            case "national varchar":
                return "255";
            case "varbinary":
                return "255";
            default:
                return "";
        }
    };
    /**
     * Creates column type definition including length, precision and scale
     */
    MysqlDriver.prototype.createFullType = function (column) {
        var type = column.type;
        // used 'getColumnLength()' method, because MySQL requires column length for `varchar`, `nvarchar` and `varbinary` data types
        if (this.getColumnLength(column)) {
            type += "(".concat(this.getColumnLength(column), ")");
        }
        else if (column.width) {
            type += "(".concat(column.width, ")");
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
    MysqlDriver.prototype.obtainMasterConnection = function () {
        var _this = this;
        return new Promise(function (ok, fail) {
            if (_this.poolCluster) {
                _this.poolCluster.getConnection("MASTER", function (err, dbConnection) {
                    err ? fail(err) : ok(_this.prepareDbConnection(dbConnection));
                });
            }
            else if (_this.pool) {
                _this.pool.getConnection(function (err, dbConnection) {
                    err ? fail(err) : ok(_this.prepareDbConnection(dbConnection));
                });
            }
            else {
                fail(new error_1.TypeORMError("Connection is not established with mysql database"));
            }
        });
    };
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    MysqlDriver.prototype.obtainSlaveConnection = function () {
        var _this = this;
        if (!this.poolCluster)
            return this.obtainMasterConnection();
        return new Promise(function (ok, fail) {
            _this.poolCluster.getConnection("SLAVE*", function (err, dbConnection) {
                err ? fail(err) : ok(_this.prepareDbConnection(dbConnection));
            });
        });
    };
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    MysqlDriver.prototype.createGeneratedMap = function (metadata, insertResult, entityIndex) {
        if (!insertResult) {
            return undefined;
        }
        if (insertResult.insertId === undefined) {
            return Object.keys(insertResult).reduce(function (map, key) {
                var column = metadata.findColumnWithDatabaseName(key);
                if (column) {
                    OrmUtils_1.OrmUtils.mergeDeep(map, column.createValueMap(insertResult[key]));
                    // OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column))); // TODO: probably should be like there, but fails on enums, fix later
                }
                return map;
            }, {});
        }
        var generatedMap = metadata.generatedColumns.reduce(function (map, generatedColumn) {
            var value;
            if (generatedColumn.generationStrategy === "increment" && insertResult.insertId) {
                // NOTE: When multiple rows is inserted by a single INSERT statement,
                // `insertId` is the value generated for the first inserted row only.
                value = insertResult.insertId + entityIndex;
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
    MysqlDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            var isColumnChanged = tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || tableColumn.length !== _this.getColumnLength(columnMetadata)
                || tableColumn.width !== columnMetadata.width
                || (columnMetadata.precision !== undefined && tableColumn.precision !== columnMetadata.precision)
                || (columnMetadata.scale !== undefined && tableColumn.scale !== columnMetadata.scale)
                || tableColumn.zerofill !== columnMetadata.zerofill
                || tableColumn.unsigned !== columnMetadata.unsigned
                || tableColumn.asExpression !== columnMetadata.asExpression
                || tableColumn.generatedType !== columnMetadata.generatedType
                || tableColumn.comment !== _this.escapeComment(columnMetadata.comment)
                || !_this.compareDefaultValues(_this.normalizeDefault(columnMetadata), tableColumn.default)
                || (tableColumn.enum && columnMetadata.enum && !OrmUtils_1.OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map(function (val) { return val + ""; })))
                || tableColumn.onUpdate !== _this.normalizeDatetimeFunction(columnMetadata.onUpdate)
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
            //     console.log("width:", tableColumn.width, columnMetadata.width);
            //     console.log("precision:", tableColumn.precision, columnMetadata.precision);
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale);
            //     console.log("zerofill:", tableColumn.zerofill, columnMetadata.zerofill);
            //     console.log("unsigned:", tableColumn.unsigned, columnMetadata.unsigned);
            //     console.log("asExpression:", tableColumn.asExpression, columnMetadata.asExpression);
            //     console.log("generatedType:", tableColumn.generatedType, columnMetadata.generatedType);
            //     console.log("comment:", tableColumn.comment, this.escapeComment(columnMetadata.comment));
            //     console.log("default:", tableColumn.default, this.normalizeDefault(columnMetadata));
            //     console.log("enum:", tableColumn.enum, columnMetadata.enum);
            //     console.log("default changed:", !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default));
            //     console.log("onUpdate:", tableColumn.onUpdate, this.normalizeOnUpdate(columnMetadata.onUpdate));
            //     console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            //     console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            //     console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            //     console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            //     console.log((columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated));
            //     console.log("==========================================");
            // }
            return isColumnChanged;
        });
    };
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    MysqlDriver.prototype.isReturningSqlSupported = function (returningType) {
        return this._isReturningSqlSupported[returningType];
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    MysqlDriver.prototype.isUUIDGenerationSupported = function () {
        return false;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    MysqlDriver.prototype.isFullTextColumnTypeSupported = function () {
        return true;
    };
    /**
     * Creates an escaped parameter.
     */
    MysqlDriver.prototype.createParameter = function (parameterName, index) {
        return "?";
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Loads all driver dependencies.
     */
    MysqlDriver.prototype.loadDependencies = function () {
        try {
            // try to load first supported package
            var mysql = this.options.driver || PlatformTools_1.PlatformTools.load("mysql");
            this.mysql = mysql;
            /*
             * Some frameworks (such as Jest) may mess up Node's require cache and provide garbage for the 'mysql' module
             * if it was not installed. We check that the object we got actually contains something otherwise we treat
             * it as if the `require` call failed.
             *
             * @see https://github.com/typeorm/typeorm/issues/1373
             */
            if (Object.keys(this.mysql).length === 0) {
                throw new error_1.TypeORMError("'mysql' was found but it is empty. Falling back to 'mysql2'.");
            }
        }
        catch (e) {
            try {
                this.mysql = PlatformTools_1.PlatformTools.load("mysql2"); // try to load second supported package
            }
            catch (e) {
                throw new DriverPackageNotInstalledError_1.DriverPackageNotInstalledError("Mysql", "mysql");
            }
        }
    };
    /**
     * Creates a new connection pool for a given database credentials.
     */
    MysqlDriver.prototype.createConnectionOptions = function (options, credentials) {
        credentials = Object.assign({}, credentials, DriverUtils_1.DriverUtils.buildDriverOptions(credentials)); // todo: do it better way
        // build connection options for the driver
        return Object.assign({}, {
            charset: options.charset,
            timezone: options.timezone,
            connectTimeout: options.connectTimeout,
            insecureAuth: options.insecureAuth,
            supportBigNumbers: options.supportBigNumbers !== undefined ? options.supportBigNumbers : true,
            bigNumberStrings: options.bigNumberStrings !== undefined ? options.bigNumberStrings : true,
            dateStrings: options.dateStrings,
            debug: options.debug,
            trace: options.trace,
            multipleStatements: options.multipleStatements,
            flags: options.flags
        }, {
            host: credentials.host,
            user: credentials.username,
            password: credentials.password,
            database: credentials.database,
            port: credentials.port,
            ssl: options.ssl,
            socketPath: credentials.socketPath
        }, options.acquireTimeout === undefined
            ? {}
            : { acquireTimeout: options.acquireTimeout }, options.extra || {});
    };
    /**
     * Creates a new connection pool for a given database credentials.
     */
    MysqlDriver.prototype.createPool = function (connectionOptions) {
        // create a connection pool
        var pool = this.mysql.createPool(connectionOptions);
        // make sure connection is working fine
        return new Promise(function (ok, fail) {
            // (issue #610) we make first connection to database to make sure if connection credentials are wrong
            // we give error before calling any other method that creates actual query runner
            pool.getConnection(function (err, connection) {
                if (err)
                    return pool.end(function () { return fail(err); });
                connection.release();
                ok(pool);
            });
        });
    };
    /**
     * Attaches all required base handlers to a database connection, such as the unhandled error handler.
     */
    MysqlDriver.prototype.prepareDbConnection = function (connection) {
        var logger = this.connection.logger;
        /*
         * Attaching an error handler to connection errors is essential, as, otherwise, errors raised will go unhandled and
         * cause the hosting app to crash.
         */
        if (connection.listeners("error").length === 0) {
            connection.on("error", function (error) { return logger.log("warn", "MySQL connection raised an error. ".concat(error)); });
        }
        return connection;
    };
    /**
     * Checks if "DEFAULT" values in the column metadata and in the database are equal.
     */
    MysqlDriver.prototype.compareDefaultValues = function (columnMetadataValue, databaseValue) {
        if (typeof columnMetadataValue === "string" && typeof databaseValue === "string") {
            // we need to cut out "'" because in mysql we can understand returned value is a string or a function
            // as result compare cannot understand if default is really changed or not
            columnMetadataValue = columnMetadataValue.replace(/^'+|'+$/g, "");
            databaseValue = databaseValue.replace(/^'+|'+$/g, "");
        }
        return columnMetadataValue === databaseValue;
    };
    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    MysqlDriver.prototype.normalizeDatetimeFunction = function (value) {
        if (!value)
            return value;
        // check if input is datetime function
        var isDatetimeFunction = value.toUpperCase().indexOf("CURRENT_TIMESTAMP") !== -1
            || value.toUpperCase().indexOf("NOW") !== -1;
        if (isDatetimeFunction) {
            // extract precision, e.g. "(3)"
            var precision = value.match(/\(\d+\)/);
            if (this.options.type === "mariadb") {
                return precision ? "CURRENT_TIMESTAMP".concat(precision[0]) : "CURRENT_TIMESTAMP()";
            }
            else {
                return precision ? "CURRENT_TIMESTAMP".concat(precision[0]) : "CURRENT_TIMESTAMP";
            }
        }
        else {
            return value;
        }
    };
    /**
     * Escapes a given comment.
     */
    MysqlDriver.prototype.escapeComment = function (comment) {
        if (!comment)
            return comment;
        comment = comment.replace(/\u0000/g, ""); // Null bytes aren't allowed in comments
        return comment;
    };
    return MysqlDriver;
}());
exports.MysqlDriver = MysqlDriver;

//# sourceMappingURL=MysqlDriver.js.map
