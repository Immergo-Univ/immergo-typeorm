import { __awaiter, __generator, __read, __spreadArray } from "tslib";
import { ConnectionIsNotSetError } from "../../error/ConnectionIsNotSetError";
import { DriverPackageNotInstalledError } from "../../error/DriverPackageNotInstalledError";
import { DriverUtils } from "../DriverUtils";
import { DateUtils } from "../../util/DateUtils";
import { PlatformTools } from "../../platform/PlatformTools";
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { OrmUtils } from "../../util/OrmUtils";
import { CockroachQueryRunner } from "./CockroachQueryRunner";
import { ApplyValueTransformers } from "../../util/ApplyValueTransformers";
import { TypeORMError } from "../../error";
import { Table } from "../../schema-builder/table/Table";
import { View } from "../../schema-builder/view/View";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
/**
 * Organizes communication with Cockroach DBMS.
 */
var CockroachDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function CockroachDriver(connection) {
        /**
         * Pool for slave databases.
         * Used in replication.
         */
        this.slaves = [];
        /**
         * We store all created query runners because we need to release them.
         */
        this.connectedQueryRunners = [];
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
         * @see https://www.cockroachlabs.com/docs/stable/data-types.html
         */
        this.supportedDataTypes = [
            "array",
            "bool",
            "boolean",
            "bytes",
            "bytea",
            "blob",
            "date",
            "numeric",
            "decimal",
            "dec",
            "float",
            "float4",
            "float8",
            "double precision",
            "real",
            "inet",
            "int",
            "int4",
            "integer",
            "int2",
            "int8",
            "int64",
            "smallint",
            "bigint",
            "interval",
            "string",
            "character varying",
            "character",
            "char",
            "char varying",
            "varchar",
            "text",
            "time",
            "time without time zone",
            "timestamp",
            "timestamptz",
            "timestamp without time zone",
            "timestamp with time zone",
            "json",
            "jsonb",
            "uuid",
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertType = "on-conflict-do-update";
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "character varying",
            "char varying",
            "varchar",
            "character",
            "char",
            "string",
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "numeric",
            "decimal",
            "dec",
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "numeric",
            "decimal",
            "dec"
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "timestamptz",
            createDateDefault: "now()",
            updateDate: "timestamptz",
            updateDateDefault: "now()",
            deleteDate: "timestamptz",
            deleteDateNullable: true,
            version: Number,
            treeLevel: Number,
            migrationId: Number,
            migrationName: "varchar",
            migrationTimestamp: "int8",
            cacheId: Number,
            cacheIdentifier: "varchar",
            cacheTime: "int8",
            cacheDuration: Number,
            cacheQuery: "string",
            cacheResult: "string",
            metadataType: "varchar",
            metadataDatabase: "varchar",
            metadataSchema: "varchar",
            metadataTable: "varchar",
            metadataName: "varchar",
            metadataValue: "string",
        };
        /**
         * Default values of length, precision and scale depends on column data type.
         * Used in the cases when length/precision/scale is not specified by user.
         */
        this.dataTypeDefaults = {
            "char": { length: 1 },
        };
        this.connection = connection;
        this.options = connection.options;
        this.isReplicated = this.options.replication ? true : false;
        // load postgres package
        this.loadDependencies();
        this.database = DriverUtils.buildDriverOptions(this.options.replication ? this.options.replication.master : this.options).database;
        this.schema = DriverUtils.buildDriverOptions(this.options).schema;
        // ObjectUtils.assign(this.options, DriverUtils.buildDriverOptions(connection.options)); // todo: do it better way
        // validate options to make sure everything is set
        // todo: revisit validation with replication in mind
        // if (!this.options.host)
        //     throw new DriverOptionNotSetError("host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.database)
        //     throw new DriverOptionNotSetError("database");
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    CockroachDriver.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, queryRunner, _d, _e;
            var _this = this;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
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
                        if (!(!this.database || !this.searchSchema)) return [3 /*break*/, 12];
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
                        if (!!this.searchSchema) return [3 /*break*/, 10];
                        _e = this;
                        return [4 /*yield*/, queryRunner.getCurrentSchema()];
                    case 9:
                        _e.searchSchema = _f.sent();
                        _f.label = 10;
                    case 10: return [4 /*yield*/, queryRunner.release()];
                    case 11:
                        _f.sent();
                        _f.label = 12;
                    case 12:
                        if (!this.schema) {
                            this.schema = this.searchSchema;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    CockroachDriver.prototype.afterConnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    /**
     * Closes connection with database.
     */
    CockroachDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.master)
                            return [2 /*return*/, Promise.reject(new ConnectionIsNotSetError("cockroachdb"))];
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
    CockroachDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    CockroachDriver.prototype.createQueryRunner = function (mode) {
        return new CockroachQueryRunner(this, mode);
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    CockroachDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamptz"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp without time zone") {
            return DateUtils.mixedDateToDate(value);
        }
        else if (__spreadArray(["json", "jsonb"], __read(this.spatialTypes), false).indexOf(columnMetadata.type) >= 0) {
            return JSON.stringify(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);
        }
        return value;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    CockroachDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        // unique_rowid() generates bigint value and should not be converted to number
        if (([Number, "int4", "smallint", "int2"].some(function (v) { return v === columnMetadata.type; })
            && !columnMetadata.isArray) || columnMetadata.generationStrategy === "increment") {
            value = parseInt(value);
        }
        else if (columnMetadata.type === Boolean) {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamptz"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp without time zone") {
            value = DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    };
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    CockroachDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
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
    CockroachDriver.prototype.escape = function (columnName) {
        return "\"" + columnName + "\"";
    };
    /**
     * Build full table name with schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    CockroachDriver.prototype.buildTableName = function (tableName, schema) {
        var tablePath = [tableName];
        if (schema) {
            tablePath.unshift(schema);
        }
        return tablePath.join(".");
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    CockroachDriver.prototype.parseTableName = function (target) {
        var driverDatabase = this.database;
        var driverSchema = this.schema;
        if (target instanceof Table || target instanceof View) {
            // name is sometimes a path
            var parsed = this.parseTableName(target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof TableForeignKey) {
            // referencedTableName is sometimes a path
            var parsed = this.parseTableName(target.referencedTableName);
            return {
                database: target.referencedDatabase || parsed.database || driverDatabase,
                schema: target.referencedSchema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof EntityMetadata) {
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
            tableName: parts.length > 1 ? parts[1] : parts[0],
        };
    };
    /**
     * Creates a database type from a given column metadata.
     */
    CockroachDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === "integer" || column.type === "int" || column.type === "bigint" || column.type === "int64") {
            return "int8";
        }
        else if (column.type === String || column.type === "character varying" || column.type === "char varying") {
            return "varchar";
        }
        else if (column.type === Date || column.type === "timestamp without time zone") {
            return "timestamp";
        }
        else if (column.type === "timestamp with time zone") {
            return "timestamptz";
        }
        else if (column.type === "time without time zone") {
            return "time";
        }
        else if (column.type === Boolean || column.type === "boolean") {
            return "bool";
        }
        else if (column.type === "simple-array" || column.type === "simple-json" || column.type === "text") {
            return "string";
        }
        else if (column.type === "bytea" || column.type === "blob") {
            return "bytes";
        }
        else if (column.type === "smallint") {
            return "int2";
        }
        else if (column.type === "numeric" || column.type === "dec") {
            return "decimal";
        }
        else if (column.type === "double precision" || column.type === "float") {
            return "float8";
        }
        else if (column.type === "real") {
            return "float4";
        }
        else if (column.type === "character") {
            return "char";
        }
        else if (column.type === "json") {
            return "jsonb";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    CockroachDriver.prototype.normalizeDefault = function (columnMetadata) {
        var defaultValue = columnMetadata.default;
        var arrayCast = columnMetadata.isArray ? "::".concat(columnMetadata.type, "[]") : "";
        if (typeof defaultValue === "number") {
            return "(".concat(defaultValue, ")");
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "true" : "false";
        }
        if (typeof defaultValue === "function") {
            var value = defaultValue();
            if (value.toUpperCase() === "CURRENT_TIMESTAMP") {
                return "current_timestamp()";
            }
            else if (value.toUpperCase() === "CURRENT_DATE") {
                return "current_date()";
            }
            return value;
        }
        if (typeof defaultValue === "string") {
            return "'".concat(defaultValue, "'").concat(arrayCast);
        }
        if (typeof defaultValue === "object" && defaultValue !== null) {
            return "'".concat(JSON.stringify(defaultValue), "'");
        }
        if (defaultValue === undefined || defaultValue === null) {
            return undefined;
        }
        return "".concat(defaultValue);
    };
    /**
     * Normalizes "isUnique" value of the column.
     */
    CockroachDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.uniques.some(function (uq) { return uq.columns.length === 1 && uq.columns[0] === column; });
    };
    /**
     * Returns default column lengths, which is required on column creation.
     */
    CockroachDriver.prototype.getColumnLength = function (column) {
        return column.length ? column.length.toString() : "";
    };
    /**
     * Creates column type definition including length, precision and scale
     */
    CockroachDriver.prototype.createFullType = function (column) {
        var type = column.type;
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
    CockroachDriver.prototype.obtainMasterConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.master) {
                    throw new TypeORMError("Driver not Connected");
                }
                return [2 /*return*/, new Promise(function (ok, fail) {
                        _this.master.connect(function (err, connection, release) {
                            err ? fail(err) : ok([connection, release]);
                        });
                    })];
            });
        });
    };
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    CockroachDriver.prototype.obtainSlaveConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var random;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.slaves.length)
                    return [2 /*return*/, this.obtainMasterConnection()];
                random = Math.floor(Math.random() * this.slaves.length);
                return [2 /*return*/, new Promise(function (ok, fail) {
                        _this.slaves[random].connect(function (err, connection, release) {
                            err ? fail(err) : ok([connection, release]);
                        });
                    })];
            });
        });
    };
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     *
     * todo: slow. optimize Object.keys(), OrmUtils.mergeDeep and column.createValueMap parts
     */
    CockroachDriver.prototype.createGeneratedMap = function (metadata, insertResult) {
        var _this = this;
        if (!insertResult)
            return undefined;
        return Object.keys(insertResult).reduce(function (map, key) {
            var column = metadata.findColumnWithDatabaseName(key);
            if (column) {
                OrmUtils.mergeDeep(map, column.createValueMap(_this.prepareHydratedValue(insertResult[key], column)));
            }
            return map;
        }, {});
    };
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    CockroachDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, columnMetadata.length);
            // console.log("width:", tableColumn.width, columnMetadata.width);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("comment:", tableColumn.comment, this.escapeComment(columnMetadata.comment));
            // console.log("default:", tableColumn.default, columnMetadata.default);
            // console.log("default changed:", !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default));
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log("==========================================");
            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || (columnMetadata.scale !== undefined && tableColumn.scale !== columnMetadata.scale)
                || tableColumn.comment !== _this.escapeComment(columnMetadata.comment)
                || (!tableColumn.isGenerated && _this.lowerDefaultValueIfNecessary(_this.normalizeDefault(columnMetadata)) !== tableColumn.default) // we included check for generated here, because generated columns already can have default values
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== _this.normalizeIsUnique(columnMetadata)
                || tableColumn.isGenerated !== columnMetadata.isGenerated;
        });
    };
    CockroachDriver.prototype.lowerDefaultValueIfNecessary = function (value) {
        if (!value) {
            return value;
        }
        return value.split("'").map(function (v, i) {
            return i % 2 === 1 ? v : v.toLowerCase();
        }).join("'");
    };
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    CockroachDriver.prototype.isReturningSqlSupported = function () {
        return true;
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    CockroachDriver.prototype.isUUIDGenerationSupported = function () {
        return true;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    CockroachDriver.prototype.isFullTextColumnTypeSupported = function () {
        return false;
    };
    /**
     * Creates an escaped parameter.
     */
    CockroachDriver.prototype.createParameter = function (parameterName, index) {
        return "$" + (index + 1);
    };
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Loads postgres query stream package.
     */
    CockroachDriver.prototype.loadStreamDependency = function () {
        try {
            return PlatformTools.load("pg-query-stream");
        }
        catch (e) { // todo: better error for browser env
            throw new TypeORMError("To use streams you should install pg-query-stream package. Please run npm i pg-query-stream --save command.");
        }
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    CockroachDriver.prototype.loadDependencies = function () {
        try {
            var postgres = this.options.driver || PlatformTools.load("pg");
            this.postgres = postgres;
            try {
                var pgNative = this.options.nativeDriver || PlatformTools.load("pg-native");
                if (pgNative && this.postgres.native)
                    this.postgres = this.postgres.native;
            }
            catch (e) { }
        }
        catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("Postgres", "pg");
        }
    };
    /**
     * Creates a new connection pool for a given database credentials.
     */
    CockroachDriver.prototype.createPool = function (options, credentials) {
        return __awaiter(this, void 0, void 0, function () {
            var connectionOptions, pool, logger, poolErrorHandler;
            return __generator(this, function (_a) {
                credentials = Object.assign({}, credentials, DriverUtils.buildDriverOptions(credentials)); // todo: do it better way
                connectionOptions = Object.assign({}, {
                    host: credentials.host,
                    user: credentials.username,
                    password: credentials.password,
                    database: credentials.database,
                    port: credentials.port,
                    ssl: credentials.ssl
                }, options.extra || {});
                pool = new this.postgres.Pool(connectionOptions);
                logger = this.connection.logger;
                poolErrorHandler = options.poolErrorHandler || (function (error) { return logger.log("warn", "Postgres pool raised an error. ".concat(error)); });
                /*
                  Attaching an error handler to pool errors is essential, as, otherwise, errors raised will go unhandled and
                  cause the hosting app to crash.
                 */
                pool.on("error", poolErrorHandler);
                return [2 /*return*/, new Promise(function (ok, fail) {
                        pool.connect(function (err, connection, release) {
                            if (err)
                                return fail(err);
                            release();
                            ok(pool);
                        });
                    })];
            });
        });
    };
    /**
     * Closes connection pool.
     */
    CockroachDriver.prototype.closePool = function (pool) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(this.connectedQueryRunners.map(function (queryRunner) { return queryRunner.release(); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (ok, fail) {
                                pool.end(function (err) { return err ? fail(err) : ok(); });
                            })];
                }
            });
        });
    };
    /**
     * Escapes a given comment.
     */
    CockroachDriver.prototype.escapeComment = function (comment) {
        if (!comment)
            return comment;
        comment = comment
            .replace(/'/g, "''")
            .replace(/\u0000/g, ""); // Null bytes aren't allowed in comments
        return comment;
    };
    return CockroachDriver;
}());
export { CockroachDriver };

//# sourceMappingURL=CockroachDriver.js.map
