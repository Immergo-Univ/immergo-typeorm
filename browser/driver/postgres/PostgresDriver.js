import { __awaiter, __generator, __read, __spreadArray } from "tslib";
import { ConnectionIsNotSetError } from "../../error/ConnectionIsNotSetError";
import { DriverPackageNotInstalledError } from "../../error/DriverPackageNotInstalledError";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { PlatformTools } from "../../platform/PlatformTools";
import { RdbmsSchemaBuilder } from "../../schema-builder/RdbmsSchemaBuilder";
import { ApplyValueTransformers } from "../../util/ApplyValueTransformers";
import { DateUtils } from "../../util/DateUtils";
import { OrmUtils } from "../../util/OrmUtils";
import { VersionUtils } from "../../util/VersionUtils";
import { PostgresQueryRunner } from "./PostgresQueryRunner";
import { DriverUtils } from "../DriverUtils";
import { TypeORMError } from "../../error";
import { Table } from "../../schema-builder/table/Table";
import { View } from "../../schema-builder/view/View";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
/**
 * Organizes communication with PostgreSQL DBMS.
 */
var PostgresDriver = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function PostgresDriver(connection) {
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
         * @see https://www.tutorialspoint.com/postgresql/postgresql_data_types.htm
         * @see https://www.postgresql.org/docs/9.2/static/datatype.html
         */
        this.supportedDataTypes = [
            "int",
            "int2",
            "int4",
            "int8",
            "smallint",
            "integer",
            "bigint",
            "decimal",
            "numeric",
            "real",
            "float",
            "float4",
            "float8",
            "double precision",
            "money",
            "character varying",
            "varchar",
            "character",
            "char",
            "text",
            "citext",
            "hstore",
            "bytea",
            "bit",
            "varbit",
            "bit varying",
            "timetz",
            "timestamptz",
            "timestamp",
            "timestamp without time zone",
            "timestamp with time zone",
            "date",
            "time",
            "time without time zone",
            "time with time zone",
            "interval",
            "bool",
            "boolean",
            "enum",
            "point",
            "line",
            "lseg",
            "box",
            "path",
            "polygon",
            "circle",
            "cidr",
            "inet",
            "macaddr",
            "tsvector",
            "tsquery",
            "uuid",
            "xml",
            "json",
            "jsonb",
            "int4range",
            "int8range",
            "numrange",
            "tsrange",
            "tstzrange",
            "daterange",
            "geometry",
            "geography",
            "cube",
            "ltree"
        ];
        /**
         * Returns type of upsert supported by driver if any
         */
        this.supportedUpsertType = "on-conflict-do-update";
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [
            "geometry",
            "geography"
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "character varying",
            "varchar",
            "character",
            "char",
            "bit",
            "varbit",
            "bit varying"
        ];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "numeric",
            "decimal",
            "interval",
            "time without time zone",
            "time with time zone",
            "timestamp without time zone",
            "timestamp with time zone"
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "numeric",
            "decimal"
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "timestamp",
            createDateDefault: "now()",
            updateDate: "timestamp",
            updateDateDefault: "now()",
            deleteDate: "timestamp",
            deleteDateNullable: true,
            version: "int4",
            treeLevel: "int4",
            migrationId: "int4",
            migrationName: "varchar",
            migrationTimestamp: "int8",
            cacheId: "int4",
            cacheIdentifier: "varchar",
            cacheTime: "int8",
            cacheDuration: "int4",
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
            "character": { length: 1 },
            "bit": { length: 1 },
            "interval": { precision: 6 },
            "time without time zone": { precision: 6 },
            "time with time zone": { precision: 6 },
            "timestamp without time zone": { precision: 6 },
            "timestamp with time zone": { precision: 6 },
        };
        /**
         * Max length allowed by Postgres for aliases.
         * @see https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
         */
        this.maxAliasLength = 63;
        this.isGeneratedColumnsSupported = false;
        if (!connection) {
            return;
        }
        this.connection = connection;
        this.options = connection.options;
        this.isReplicated = this.options.replication ? true : false;
        if (this.options.useUTC) {
            process.env.PGTZ = "UTC";
        }
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
    PostgresDriver.prototype.connect = function () {
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
    PostgresDriver.prototype.afterConnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var extensionsMetadata, _a, connection, release, installExtensions, results, versionString;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.checkMetadataForExtensions()];
                    case 1:
                        extensionsMetadata = _b.sent();
                        return [4 /*yield*/, this.obtainMasterConnection()];
                    case 2:
                        _a = __read.apply(void 0, [_b.sent(), 2]), connection = _a[0], release = _a[1];
                        installExtensions = this.options.installExtensions === undefined || this.options.installExtensions;
                        if (!(installExtensions && extensionsMetadata.hasExtensions)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.enableExtensions(extensionsMetadata, connection)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4: return [4 /*yield*/, this.executeQuery(connection, "SHOW server_version;")];
                    case 5:
                        results = _b.sent();
                        versionString = results.rows[0].server_version;
                        this.isGeneratedColumnsSupported = VersionUtils.isGreaterOrEqual(versionString, "12.0");
                        return [4 /*yield*/, release()];
                    case 6:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PostgresDriver.prototype.enableExtensions = function (extensionsMetadata, connection) {
        return __awaiter(this, void 0, void 0, function () {
            var logger, hasUuidColumns, hasCitextColumns, hasHstoreColumns, hasCubeColumns, hasGeometryColumns, hasLtreeColumns, hasExclusionConstraints, _1, _2, _3, _4, _5, _6, _7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger = this.connection.logger;
                        hasUuidColumns = extensionsMetadata.hasUuidColumns, hasCitextColumns = extensionsMetadata.hasCitextColumns, hasHstoreColumns = extensionsMetadata.hasHstoreColumns, hasCubeColumns = extensionsMetadata.hasCubeColumns, hasGeometryColumns = extensionsMetadata.hasGeometryColumns, hasLtreeColumns = extensionsMetadata.hasLtreeColumns, hasExclusionConstraints = extensionsMetadata.hasExclusionConstraints;
                        if (!hasUuidColumns) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"".concat(this.options.uuidExtension || "uuid-ossp", "\""))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _1 = _a.sent();
                        logger.log("warn", "At least one of the entities has uuid column, but the '".concat(this.options.uuidExtension || "uuid-ossp", "' extension cannot be installed automatically. Please install it manually using superuser rights, or select another uuid extension."));
                        return [3 /*break*/, 4];
                    case 4:
                        if (!hasCitextColumns) return [3 /*break*/, 8];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"citext\"")];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        _2 = _a.sent();
                        logger.log("warn", "At least one of the entities has citext column, but the 'citext' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 8];
                    case 8:
                        if (!hasHstoreColumns) return [3 /*break*/, 12];
                        _a.label = 9;
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"hstore\"")];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        _3 = _a.sent();
                        logger.log("warn", "At least one of the entities has hstore column, but the 'hstore' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 12];
                    case 12:
                        if (!hasGeometryColumns) return [3 /*break*/, 16];
                        _a.label = 13;
                    case 13:
                        _a.trys.push([13, 15, , 16]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"postgis\"")];
                    case 14:
                        _a.sent();
                        return [3 /*break*/, 16];
                    case 15:
                        _4 = _a.sent();
                        logger.log("warn", "At least one of the entities has a geometry column, but the 'postgis' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 16];
                    case 16:
                        if (!hasCubeColumns) return [3 /*break*/, 20];
                        _a.label = 17;
                    case 17:
                        _a.trys.push([17, 19, , 20]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"cube\"")];
                    case 18:
                        _a.sent();
                        return [3 /*break*/, 20];
                    case 19:
                        _5 = _a.sent();
                        logger.log("warn", "At least one of the entities has a cube column, but the 'cube' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 20];
                    case 20:
                        if (!hasLtreeColumns) return [3 /*break*/, 24];
                        _a.label = 21;
                    case 21:
                        _a.trys.push([21, 23, , 24]);
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"ltree\"")];
                    case 22:
                        _a.sent();
                        return [3 /*break*/, 24];
                    case 23:
                        _6 = _a.sent();
                        logger.log("warn", "At least one of the entities has a cube column, but the 'ltree' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 24];
                    case 24:
                        if (!hasExclusionConstraints) return [3 /*break*/, 28];
                        _a.label = 25;
                    case 25:
                        _a.trys.push([25, 27, , 28]);
                        // The btree_gist extension provides operator support in PostgreSQL exclusion constraints
                        return [4 /*yield*/, this.executeQuery(connection, "CREATE EXTENSION IF NOT EXISTS \"btree_gist\"")];
                    case 26:
                        // The btree_gist extension provides operator support in PostgreSQL exclusion constraints
                        _a.sent();
                        return [3 /*break*/, 28];
                    case 27:
                        _7 = _a.sent();
                        logger.log("warn", "At least one of the entities has an exclusion constraint, but the 'btree_gist' extension cannot be installed automatically. Please install it manually using superuser rights");
                        return [3 /*break*/, 28];
                    case 28: return [2 /*return*/];
                }
            });
        });
    };
    PostgresDriver.prototype.checkMetadataForExtensions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var hasUuidColumns, hasCitextColumns, hasHstoreColumns, hasCubeColumns, hasGeometryColumns, hasLtreeColumns, hasExclusionConstraints;
            var _this = this;
            return __generator(this, function (_a) {
                hasUuidColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.generatedColumns.filter(function (column) { return column.generationStrategy === "uuid"; }).length > 0;
                });
                hasCitextColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.columns.filter(function (column) { return column.type === "citext"; }).length > 0;
                });
                hasHstoreColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.columns.filter(function (column) { return column.type === "hstore"; }).length > 0;
                });
                hasCubeColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.columns.filter(function (column) { return column.type === "cube"; }).length > 0;
                });
                hasGeometryColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.columns.filter(function (column) { return _this.spatialTypes.indexOf(column.type) >= 0; }).length > 0;
                });
                hasLtreeColumns = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.columns.filter(function (column) { return column.type === "ltree"; }).length > 0;
                });
                hasExclusionConstraints = this.connection.entityMetadatas.some(function (metadata) {
                    return metadata.exclusions.length > 0;
                });
                return [2 /*return*/, {
                        hasUuidColumns: hasUuidColumns,
                        hasCitextColumns: hasCitextColumns,
                        hasHstoreColumns: hasHstoreColumns,
                        hasCubeColumns: hasCubeColumns,
                        hasGeometryColumns: hasGeometryColumns,
                        hasLtreeColumns: hasLtreeColumns,
                        hasExclusionConstraints: hasExclusionConstraints,
                        hasExtensions: hasUuidColumns || hasCitextColumns || hasHstoreColumns || hasGeometryColumns || hasCubeColumns || hasLtreeColumns || hasExclusionConstraints,
                    }];
            });
        });
    };
    /**
     * Closes connection with database.
     */
    PostgresDriver.prototype.disconnect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.master)
                            return [2 /*return*/, Promise.reject(new ConnectionIsNotSetError("postgres"))];
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
    PostgresDriver.prototype.createSchemaBuilder = function () {
        return new RdbmsSchemaBuilder(this.connection);
    };
    /**
     * Creates a query runner used to execute database queries.
     */
    PostgresDriver.prototype.createQueryRunner = function (mode) {
        return new PostgresQueryRunner(this, mode);
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    PostgresDriver.prototype.preparePersistentValue = function (value, columnMetadata) {
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
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp without time zone") {
            return DateUtils.mixedDateToDate(value);
        }
        else if (__spreadArray(["json", "jsonb"], __read(this.spatialTypes), false).indexOf(columnMetadata.type) >= 0) {
            return JSON.stringify(value);
        }
        else if (columnMetadata.type === "hstore") {
            if (typeof value === "string") {
                return value;
            }
            else {
                // https://www.postgresql.org/docs/9.0/hstore.html
                var quoteString_1 = function (value) {
                    // If a string to be quoted is `null` or `undefined`, we return a literal unquoted NULL.
                    // This way, NULL values can be stored in the hstore object.
                    if (value === null || typeof value === "undefined") {
                        return "NULL";
                    }
                    // Convert non-null values to string since HStore only stores strings anyway.
                    // To include a double quote or a backslash in a key or value, escape it with a backslash.
                    return "\"".concat("".concat(value).replace(/(?=["\\])/g, "\\"), "\"");
                };
                return Object.keys(value).map(function (key) { return quoteString_1(key) + "=>" + quoteString_1(value[key]); }).join(",");
            }
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "cube") {
            if (columnMetadata.isArray) {
                return "{".concat(value.map(function (cube) { return "\"(".concat(cube.join(","), ")\""); }).join(","), "}");
            }
            return "(".concat(value.join(","), ")");
        }
        else if (columnMetadata.type === "ltree") {
            return value.split(".").filter(Boolean).join(".").replace(/[\s]+/g, "_");
        }
        else if ((columnMetadata.type === "enum"
            || columnMetadata.type === "simple-enum")
            && !columnMetadata.isArray) {
            return "" + value;
        }
        return value;
    };
    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    PostgresDriver.prototype.prepareHydratedValue = function (value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean) {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
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
        else if (columnMetadata.type === "hstore") {
            if (columnMetadata.hstoreType === "object") {
                var unescapeString_1 = function (str) { return str.replace(/\\./g, function (m) { return m[1]; }); };
                var regexp = /"([^"\\]*(?:\\.[^"\\]*)*)"=>(?:(NULL)|"([^"\\]*(?:\\.[^"\\]*)*)")(?:,|$)/g;
                var object_1 = {};
                "".concat(value).replace(regexp, function (_, key, nullValue, stringValue) {
                    object_1[unescapeString_1(key)] = nullValue ? null : unescapeString_1(stringValue);
                    return "";
                });
                return object_1;
            }
            else {
                return value;
            }
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value);
        }
        else if (columnMetadata.type === "cube") {
            value = value.replace(/[\(\)\s]+/g, ""); // remove whitespace
            if (columnMetadata.isArray) {
                /**
                 * Strips these groups from `{"1,2,3","",NULL}`:
                 * 1. ["1,2,3", undefined]  <- cube of arity 3
                 * 2. ["", undefined]         <- cube of arity 0
                 * 3. [undefined, "NULL"]     <- NULL
                 */
                var regexp = /(?:\"((?:[\d\s\.,])*)\")|(?:(NULL))/g;
                var unparsedArrayString = value;
                value = [];
                var cube = null;
                // Iterate through all regexp matches for cubes/null in array
                while ((cube = regexp.exec(unparsedArrayString)) !== null) {
                    if (cube[1] !== undefined) {
                        value.push(cube[1].split(",").filter(Boolean).map(Number));
                    }
                    else {
                        value.push(undefined);
                    }
                }
            }
            else {
                value = value.split(",").filter(Boolean).map(Number);
            }
        }
        else if (columnMetadata.type === "enum" || columnMetadata.type === "simple-enum") {
            if (columnMetadata.isArray) {
                if (value === "{}")
                    return [];
                // manually convert enum array to array of values (pg does not support, see https://github.com/brianc/node-pg-types/issues/56)
                value = value.substr(1, value.length - 2).split(",").map(function (val) {
                    // replace double quotes from the beginning and from the end
                    if (val.startsWith("\"") && val.endsWith("\""))
                        val = val.slice(1, -1);
                    // replace double escaped backslash to single escaped e.g. \\\\ -> \\
                    val = val.replace(/(\\\\)/g, "\\");
                    // replace escaped double quotes to non-escaped e.g. \"asd\" -> "asd"
                    return val.replace(/(\\")/g, '"');
                });
                // convert to number if that exists in possible enum options
                value = value.map(function (val) {
                    return !isNaN(+val) && columnMetadata.enum.indexOf(parseInt(val)) >= 0 ? parseInt(val) : val;
                });
            }
            else {
                // convert to number if that exists in possible enum options
                value = !isNaN(+value) && columnMetadata.enum.indexOf(parseInt(value)) >= 0 ? parseInt(value) : value;
            }
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    };
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    PostgresDriver.prototype.escapeQueryWithParameters = function (sql, parameters, nativeParameters) {
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
    PostgresDriver.prototype.escape = function (columnName) {
        return "\"" + columnName + "\"";
    };
    /**
     * Build full table name with schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    PostgresDriver.prototype.buildTableName = function (tableName, schema) {
        var tablePath = [tableName];
        if (schema) {
            tablePath.unshift(schema);
        }
        return tablePath.join(".");
    };
    /**
     * Parse a target table name or other types and return a normalized table definition.
     */
    PostgresDriver.prototype.parseTableName = function (target) {
        var driverDatabase = this.database;
        var driverSchema = this.schema;
        if (target instanceof Table || target instanceof View) {
            var parsed = this.parseTableName(target.name);
            return {
                database: target.database || parsed.database || driverDatabase,
                schema: target.schema || parsed.schema || driverSchema,
                tableName: parsed.tableName
            };
        }
        if (target instanceof TableForeignKey) {
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
    PostgresDriver.prototype.normalizeType = function (column) {
        if (column.type === Number || column.type === "int" || column.type === "int4") {
            return "integer";
        }
        else if (column.type === String || column.type === "varchar") {
            return "character varying";
        }
        else if (column.type === Date || column.type === "timestamp") {
            return "timestamp without time zone";
        }
        else if (column.type === "timestamptz") {
            return "timestamp with time zone";
        }
        else if (column.type === "time") {
            return "time without time zone";
        }
        else if (column.type === "timetz") {
            return "time with time zone";
        }
        else if (column.type === Boolean || column.type === "bool") {
            return "boolean";
        }
        else if (column.type === "simple-array") {
            return "text";
        }
        else if (column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "enum";
        }
        else if (column.type === "int2") {
            return "smallint";
        }
        else if (column.type === "int8") {
            return "bigint";
        }
        else if (column.type === "decimal") {
            return "numeric";
        }
        else if (column.type === "float8" || column.type === "float") {
            return "double precision";
        }
        else if (column.type === "float4") {
            return "real";
        }
        else if (column.type === "char") {
            return "character";
        }
        else if (column.type === "varbit") {
            return "bit varying";
        }
        else {
            return column.type || "";
        }
    };
    /**
     * Normalizes "default" value of the column.
     */
    PostgresDriver.prototype.normalizeDefault = function (columnMetadata) {
        var defaultValue = columnMetadata.default;
        if (defaultValue === null) {
            return undefined;
        }
        if (columnMetadata.isArray && Array.isArray(defaultValue)) {
            return "'{".concat(defaultValue.map(function (val) { return "".concat(val); }).join(","), "}'");
        }
        if ((columnMetadata.type === "enum"
            || columnMetadata.type === "simple-enum"
            || typeof defaultValue === "number"
            || typeof defaultValue === "string")
            && defaultValue !== undefined) {
            return "'".concat(defaultValue, "'");
        }
        if (typeof defaultValue === "boolean") {
            return defaultValue ? "true" : "false";
        }
        if (typeof defaultValue === "function") {
            var value = defaultValue();
            return this.normalizeDatetimeFunction(value);
        }
        if (typeof defaultValue === "object") {
            return "'".concat(JSON.stringify(defaultValue), "'");
        }
        if (defaultValue === undefined) {
            return undefined;
        }
        return "".concat(defaultValue);
    };
    /**
     * Compares "default" value of the column.
     * Postgres sorts json values before it is saved, so in that case a deep comparison has to be performed to see if has changed.
     */
    PostgresDriver.prototype.defaultEqual = function (columnMetadata, tableColumn) {
        if (["json", "jsonb"].includes(columnMetadata.type)
            && !["function", "undefined"].includes(typeof columnMetadata.default)) {
            var tableColumnDefault = typeof tableColumn.default === "string" ?
                JSON.parse(tableColumn.default.substring(1, tableColumn.default.length - 1)) :
                tableColumn.default;
            return OrmUtils.deepCompare(columnMetadata.default, tableColumnDefault);
        }
        var columnDefault = this.lowerDefaultValueIfNecessary(this.normalizeDefault(columnMetadata));
        return columnDefault === tableColumn.default;
    };
    /**
     * Normalizes "isUnique" value of the column.
     */
    PostgresDriver.prototype.normalizeIsUnique = function (column) {
        return column.entityMetadata.uniques.some(function (uq) { return uq.columns.length === 1 && uq.columns[0] === column; });
    };
    /**
     * Returns default column lengths, which is required on column creation.
     */
    PostgresDriver.prototype.getColumnLength = function (column) {
        return column.length ? column.length.toString() : "";
    };
    /**
     * Creates column type definition including length, precision and scale
     */
    PostgresDriver.prototype.createFullType = function (column) {
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
        if (column.type === "time without time zone") {
            type = "TIME" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "");
        }
        else if (column.type === "time with time zone") {
            type = "TIME" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "") + " WITH TIME ZONE";
        }
        else if (column.type === "timestamp without time zone") {
            type = "TIMESTAMP" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "");
        }
        else if (column.type === "timestamp with time zone") {
            type = "TIMESTAMP" + (column.precision !== null && column.precision !== undefined ? "(" + column.precision + ")" : "") + " WITH TIME ZONE";
        }
        else if (this.spatialTypes.indexOf(column.type) >= 0) {
            if (column.spatialFeatureType != null && column.srid != null) {
                type = "".concat(column.type, "(").concat(column.spatialFeatureType, ",").concat(column.srid, ")");
            }
            else if (column.spatialFeatureType != null) {
                type = "".concat(column.type, "(").concat(column.spatialFeatureType, ")");
            }
            else {
                type = column.type;
            }
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
    PostgresDriver.prototype.obtainMasterConnection = function () {
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
    PostgresDriver.prototype.obtainSlaveConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var random;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.slaves.length) {
                    return [2 /*return*/, this.obtainMasterConnection()];
                }
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
    PostgresDriver.prototype.createGeneratedMap = function (metadata, insertResult) {
        if (!insertResult)
            return undefined;
        return Object.keys(insertResult).reduce(function (map, key) {
            var column = metadata.findColumnWithDatabaseName(key);
            if (column) {
                OrmUtils.mergeDeep(map, column.createValueMap(insertResult[key]));
                // OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column))); // TODO: probably should be like there, but fails on enums, fix later
            }
            return map;
        }, {});
    };
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    PostgresDriver.prototype.findChangedColumns = function (tableColumns, columnMetadatas) {
        var _this = this;
        return columnMetadatas.filter(function (columnMetadata) {
            var tableColumn = tableColumns.find(function (c) { return c.name === columnMetadata.databaseName; });
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            var isColumnChanged = tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== _this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.isArray !== columnMetadata.isArray
                || tableColumn.precision !== columnMetadata.precision
                || (columnMetadata.scale !== undefined && tableColumn.scale !== columnMetadata.scale)
                || tableColumn.comment !== _this.escapeComment(columnMetadata.comment)
                || (!tableColumn.isGenerated && !_this.defaultEqual(columnMetadata, tableColumn)) // we included check for generated here, because generated columns already can have default values
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== _this.normalizeIsUnique(columnMetadata)
                || tableColumn.enumName !== columnMetadata.enumName
                || (tableColumn.enum && columnMetadata.enum && !OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map(function (val) { return val + ""; }))) // enums in postgres are always strings
                || tableColumn.isGenerated !== columnMetadata.isGenerated
                || (tableColumn.spatialFeatureType || "").toLowerCase() !== (columnMetadata.spatialFeatureType || "").toLowerCase()
                || tableColumn.srid !== columnMetadata.srid
                || tableColumn.generatedType !== columnMetadata.generatedType
                || (tableColumn.asExpression || "").trim() !== (columnMetadata.asExpression || "").trim();
            // DEBUG SECTION
            // if (isColumnChanged) {
            //     console.log("table:", columnMetadata.entityMetadata.tableName);
            //     console.log("name:", tableColumn.name, columnMetadata.databaseName);
            //     console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            //     console.log("length:", tableColumn.length, columnMetadata.length);
            //     console.log("isArray:", tableColumn.isArray, columnMetadata.isArray);
            //     console.log("precision:", tableColumn.precision, columnMetadata.precision);
            //     console.log("scale:", tableColumn.scale, columnMetadata.scale);
            //     console.log("comment:", tableColumn.comment, this.escapeComment(columnMetadata.comment));
            //     console.log("enumName:", tableColumn.enumName, columnMetadata.enumName);
            //     console.log("enum:", tableColumn.enum && columnMetadata.enum && !OrmUtils.isArraysEqual(tableColumn.enum, columnMetadata.enum.map(val => val + "")));
            //     console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            //     console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            //     console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            //     console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            //     console.log("isGenerated 2:", !tableColumn.isGenerated && this.lowerDefaultValueIfNecessary(this.normalizeDefault(columnMetadata)) !== tableColumn.default);
            //     console.log("spatialFeatureType:", (tableColumn.spatialFeatureType || "").toLowerCase(), (columnMetadata.spatialFeatureType || "").toLowerCase());
            //     console.log("srid", tableColumn.srid, columnMetadata.srid);
            //     console.log("==========================================");
            // }
            return isColumnChanged;
        });
    };
    PostgresDriver.prototype.lowerDefaultValueIfNecessary = function (value) {
        // Postgres saves function calls in default value as lowercase #2733
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
    PostgresDriver.prototype.isReturningSqlSupported = function () {
        return true;
    };
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    PostgresDriver.prototype.isUUIDGenerationSupported = function () {
        return true;
    };
    /**
     * Returns true if driver supports fulltext indices.
     */
    PostgresDriver.prototype.isFullTextColumnTypeSupported = function () {
        return false;
    };
    Object.defineProperty(PostgresDriver.prototype, "uuidGenerator", {
        get: function () {
            return this.options.uuidExtension === "pgcrypto" ? "gen_random_uuid()" : "uuid_generate_v4()";
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Creates an escaped parameter.
     */
    PostgresDriver.prototype.createParameter = function (parameterName, index) {
        return "$" + (index + 1);
    };
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Loads postgres query stream package.
     */
    PostgresDriver.prototype.loadStreamDependency = function () {
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
    PostgresDriver.prototype.loadDependencies = function () {
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
    PostgresDriver.prototype.createPool = function (options, credentials) {
        return __awaiter(this, void 0, void 0, function () {
            var connectionOptions, pool, logger, poolErrorHandler;
            var _this = this;
            return __generator(this, function (_a) {
                credentials = Object.assign({}, credentials);
                connectionOptions = Object.assign({}, {
                    connectionString: credentials.url,
                    host: credentials.host,
                    user: credentials.username,
                    password: credentials.password,
                    database: credentials.database,
                    port: credentials.port,
                    ssl: credentials.ssl,
                    connectionTimeoutMillis: options.connectTimeoutMS,
                    application_name: options.applicationName
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
                            if (options.logNotifications) {
                                connection.on("notice", function (msg) {
                                    msg && _this.connection.logger.log("info", msg.message);
                                });
                                connection.on("notification", function (msg) {
                                    msg && _this.connection.logger.log("info", "Received NOTIFY on channel ".concat(msg.channel, ": ").concat(msg.payload, "."));
                                });
                            }
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
    PostgresDriver.prototype.closePool = function (pool) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.connectedQueryRunners.length) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connectedQueryRunners[0].release()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 0];
                    case 2: return [2 /*return*/, new Promise(function (ok, fail) {
                            pool.end(function (err) { return err ? fail(err) : ok(); });
                        })];
                }
            });
        });
    };
    /**
     * Executes given query.
     */
    PostgresDriver.prototype.executeQuery = function (connection, query) {
        this.connection.logger.logQuery(query);
        return new Promise(function (ok, fail) {
            connection.query(query, function (err, result) { return err ? fail(err) : ok(result); });
        });
    };
    /**
     * If parameter is a datetime function, e.g. "CURRENT_TIMESTAMP", normalizes it.
     * Otherwise returns original input.
     */
    PostgresDriver.prototype.normalizeDatetimeFunction = function (value) {
        // check if input is datetime function
        var upperCaseValue = value.toUpperCase();
        var isDatetimeFunction = upperCaseValue.indexOf("CURRENT_TIMESTAMP") !== -1
            || upperCaseValue.indexOf("CURRENT_DATE") !== -1
            || upperCaseValue.indexOf("CURRENT_TIME") !== -1
            || upperCaseValue.indexOf("LOCALTIMESTAMP") !== -1
            || upperCaseValue.indexOf("LOCALTIME") !== -1;
        if (isDatetimeFunction) {
            // extract precision, e.g. "(3)"
            var precision = value.match(/\(\d+\)/);
            if (upperCaseValue.indexOf("CURRENT_TIMESTAMP") !== -1) {
                return precision ? "('now'::text)::timestamp".concat(precision[0], " with time zone") : "now()";
            }
            else if (upperCaseValue === "CURRENT_DATE") {
                return "('now'::text)::date";
            }
            else if (upperCaseValue.indexOf("CURRENT_TIME") !== -1) {
                return precision ? "('now'::text)::time".concat(precision[0], " with time zone") : "('now'::text)::time with time zone";
            }
            else if (upperCaseValue.indexOf("LOCALTIMESTAMP") !== -1) {
                return precision ? "('now'::text)::timestamp".concat(precision[0], " without time zone") : "('now'::text)::timestamp without time zone";
            }
            else if (upperCaseValue.indexOf("LOCALTIME") !== -1) {
                return precision ? "('now'::text)::time".concat(precision[0], " without time zone") : "('now'::text)::time without time zone";
            }
        }
        return value;
    };
    /**
     * Escapes a given comment.
     */
    PostgresDriver.prototype.escapeComment = function (comment) {
        if (!comment)
            return comment;
        comment = comment.replace(/\u0000/g, ""); // Null bytes aren't allowed in comments
        return comment;
    };
    return PostgresDriver;
}());
export { PostgresDriver };

//# sourceMappingURL=PostgresDriver.js.map
