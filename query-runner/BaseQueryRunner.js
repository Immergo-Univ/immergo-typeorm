"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseQueryRunner = void 0;
var tslib_1 = require("tslib");
var Query_1 = require("../driver/Query");
var SqlInMemory_1 = require("../driver/SqlInMemory");
var TypeORMError_1 = require("../error/TypeORMError");
var OrmUtils_1 = require("../util/OrmUtils");
var BaseQueryRunner = /** @class */ (function () {
    function BaseQueryRunner() {
        // -------------------------------------------------------------------------
        // Public Properties
        // -------------------------------------------------------------------------
        /**
         * Indicates if connection for this query runner is released.
         * Once its released, query runner cannot run queries anymore.
         */
        this.isReleased = false;
        /**
         * Indicates if transaction is in progress.
         */
        this.isTransactionActive = false;
        /**
         * Stores temporarily user data.
         * Useful for sharing data with subscribers.
         */
        this.data = {};
        /**
         * All synchronized tables in the database.
         */
        this.loadedTables = [];
        /**
         * All synchronized views in the database.
         */
        this.loadedViews = [];
        /**
         * Indicates if special query runner mode in which sql queries won't be executed is enabled.
         */
        this.sqlMemoryMode = false;
        /**
         * Sql-s stored if "sql in memory" mode is enabled.
         */
        this.sqlInMemory = new SqlInMemory_1.SqlInMemory();
        /**
         * current depth of transaction.
         * for transactionDepth > 0 will use SAVEPOINT to start and commit/rollback transaction blocks
         */
        this.transactionDepth = 0;
        this.cachedTablePaths = {};
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Called before migrations are run.
     */
    BaseQueryRunner.prototype.beforeMigration = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    /**
     * Called after migrations are run.
     */
    BaseQueryRunner.prototype.afterMigration = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    /**
     * Loads given table's data from the database.
     */
    BaseQueryRunner.prototype.getTable = function (tablePath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.loadTables([tablePath])];
                    case 1:
                        _a.loadedTables = _b.sent();
                        return [2 /*return*/, this.loadedTables.length > 0 ? this.loadedTables[0] : undefined];
                }
            });
        });
    };
    /**
     * Loads all tables (with given names) from the database.
     */
    BaseQueryRunner.prototype.getTables = function (tableNames) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!tableNames) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.loadTables(tableNames)];
                    case 1: 
                    // Don't cache in this case.
                    // This is the new case & isn't used anywhere else anyway.
                    return [2 /*return*/, _b.sent()];
                    case 2:
                        _a = this;
                        return [4 /*yield*/, this.loadTables(tableNames)];
                    case 3:
                        _a.loadedTables = _b.sent();
                        return [2 /*return*/, this.loadedTables];
                }
            });
        });
    };
    /**
     * Loads given view's data from the database.
     */
    BaseQueryRunner.prototype.getView = function (viewPath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.loadViews([viewPath])];
                    case 1:
                        _a.loadedViews = _b.sent();
                        return [2 /*return*/, this.loadedViews.length > 0 ? this.loadedViews[0] : undefined];
                }
            });
        });
    };
    /**
     * Loads given view's data from the database.
     */
    BaseQueryRunner.prototype.getViews = function (viewPaths) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this;
                        return [4 /*yield*/, this.loadViews(viewPaths)];
                    case 1:
                        _a.loadedViews = _b.sent();
                        return [2 /*return*/, this.loadedViews];
                }
            });
        });
    };
    /**
     * Enables special query runner mode in which sql queries won't be executed,
     * instead they will be memorized into a special variable inside query runner.
     * You can get memorized sql using getMemorySql() method.
     */
    BaseQueryRunner.prototype.enableSqlMemory = function () {
        this.sqlInMemory = new SqlInMemory_1.SqlInMemory();
        this.sqlMemoryMode = true;
    };
    /**
     * Disables special query runner mode in which sql queries won't be executed
     * started by calling enableSqlMemory() method.
     *
     * Previously memorized sql will be flushed.
     */
    BaseQueryRunner.prototype.disableSqlMemory = function () {
        this.sqlInMemory = new SqlInMemory_1.SqlInMemory();
        this.sqlMemoryMode = false;
    };
    /**
     * Flushes all memorized sqls.
     */
    BaseQueryRunner.prototype.clearSqlMemory = function () {
        this.sqlInMemory = new SqlInMemory_1.SqlInMemory();
    };
    /**
     * Gets sql stored in the memory. Parameters in the sql are already replaced.
     */
    BaseQueryRunner.prototype.getMemorySql = function () {
        return this.sqlInMemory;
    };
    /**
     * Executes up sql queries.
     */
    BaseQueryRunner.prototype.executeMemoryUpSql = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a, _b, _c, query, parameters, e_1_1;
            var e_1, _d;
            return (0, tslib_1.__generator)(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 5, 6, 7]);
                        _a = (0, tslib_1.__values)(this.sqlInMemory.upQueries), _b = _a.next();
                        _e.label = 1;
                    case 1:
                        if (!!_b.done) return [3 /*break*/, 4];
                        _c = _b.value, query = _c.query, parameters = _c.parameters;
                        return [4 /*yield*/, this.query(query, parameters)];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3:
                        _b = _a.next();
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 7];
                    case 6:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes down sql queries.
     */
    BaseQueryRunner.prototype.executeMemoryDownSql = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var _a, _b, _c, query, parameters, e_2_1;
            var e_2, _d;
            return (0, tslib_1.__generator)(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 5, 6, 7]);
                        _a = (0, tslib_1.__values)(this.sqlInMemory.downQueries.reverse()), _b = _a.next();
                        _e.label = 1;
                    case 1:
                        if (!!_b.done) return [3 /*break*/, 4];
                        _c = _b.value, query = _c.query, parameters = _c.parameters;
                        return [4 /*yield*/, this.query(query, parameters)];
                    case 2:
                        _e.sent();
                        _e.label = 3;
                    case 3:
                        _b = _a.next();
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        e_2_1 = _e.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 7];
                    case 6:
                        try {
                            if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    BaseQueryRunner.prototype.getReplicationMode = function () {
        return this.mode;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Gets view from previously loaded views, otherwise loads it from database.
     */
    BaseQueryRunner.prototype.getCachedView = function (viewName) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var view, foundViews;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        view = this.loadedViews.find(function (view) { return view.name === viewName; });
                        if (view)
                            return [2 /*return*/, view];
                        return [4 /*yield*/, this.loadViews([viewName])];
                    case 1:
                        foundViews = _a.sent();
                        if (foundViews.length > 0) {
                            this.loadedViews.push(foundViews[0]);
                            return [2 /*return*/, foundViews[0]];
                        }
                        else {
                            throw new TypeORMError_1.TypeORMError("View \"".concat(viewName, "\" does not exist."));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gets table from previously loaded tables, otherwise loads it from database.
     */
    BaseQueryRunner.prototype.getCachedTable = function (tableName) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var tablePath_1, table, foundTables, foundTablePath_1, cachedTable;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (tableName in this.cachedTablePaths) {
                            tablePath_1 = this.cachedTablePaths[tableName];
                            table = this.loadedTables.find(function (table) { return _this.getTablePath(table) === tablePath_1; });
                            if (table) {
                                return [2 /*return*/, table];
                            }
                        }
                        return [4 /*yield*/, this.loadTables([tableName])];
                    case 1:
                        foundTables = _a.sent();
                        if (foundTables.length > 0) {
                            foundTablePath_1 = this.getTablePath(foundTables[0]);
                            cachedTable = this.loadedTables.find(function (table) { return _this.getTablePath(table) === foundTablePath_1; });
                            if (!cachedTable) {
                                this.cachedTablePaths[tableName] = this.getTablePath(foundTables[0]);
                                this.loadedTables.push(foundTables[0]);
                                return [2 /*return*/, foundTables[0]];
                            }
                            else {
                                return [2 /*return*/, cachedTable];
                            }
                        }
                        else {
                            throw new TypeORMError_1.TypeORMError("Table \"".concat(tableName, "\" does not exist."));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Replaces loaded table with given changed table.
     */
    BaseQueryRunner.prototype.replaceCachedTable = function (table, changedTable) {
        var e_3, _a;
        var _this = this;
        var oldTablePath = this.getTablePath(table);
        var foundTable = this.loadedTables.find(function (loadedTable) { return _this.getTablePath(loadedTable) === oldTablePath; });
        try {
            // Clean up the lookup cache..
            for (var _b = (0, tslib_1.__values)(Object.entries(this.cachedTablePaths)), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = (0, tslib_1.__read)(_c.value, 2), key = _d[0], cachedPath = _d[1];
                if (cachedPath === oldTablePath) {
                    this.cachedTablePaths[key] = this.getTablePath(changedTable);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        if (foundTable) {
            foundTable.database = changedTable.database;
            foundTable.schema = changedTable.schema;
            foundTable.name = changedTable.name;
            foundTable.columns = changedTable.columns;
            foundTable.indices = changedTable.indices;
            foundTable.foreignKeys = changedTable.foreignKeys;
            foundTable.uniques = changedTable.uniques;
            foundTable.checks = changedTable.checks;
            foundTable.justCreated = changedTable.justCreated;
            foundTable.engine = changedTable.engine;
        }
    };
    BaseQueryRunner.prototype.getTablePath = function (target) {
        var parsed = this.connection.driver.parseTableName(target);
        return this.connection.driver.buildTableName(parsed.tableName, parsed.schema, parsed.database);
    };
    BaseQueryRunner.prototype.getTypeormMetadataTableName = function () {
        var options = this.connection.driver.options;
        return this.connection.driver.buildTableName(this.connection.metadataTableName, options.schema, options.database);
    };
    /**
     * Generates SQL query to insert a record into typeorm metadata table.
     */
    BaseQueryRunner.prototype.insertTypeormMetadataSql = function (_a) {
        var database = _a.database, schema = _a.schema, table = _a.table, type = _a.type, name = _a.name, value = _a.value;
        var _b = (0, tslib_1.__read)(this.connection.createQueryBuilder()
            .insert()
            .into(this.getTypeormMetadataTableName())
            .values({ database: database, schema: schema, table: table, type: type, name: name, value: value })
            .getQueryAndParameters(), 2), query = _b[0], parameters = _b[1];
        return new Query_1.Query(query, parameters);
    };
    /**
     * Generates SQL query to delete a record from typeorm metadata table.
     */
    BaseQueryRunner.prototype.deleteTypeormMetadataSql = function (_a) {
        var database = _a.database, schema = _a.schema, table = _a.table, type = _a.type, name = _a.name;
        var qb = this.connection.createQueryBuilder();
        var deleteQb = qb.delete()
            .from(this.getTypeormMetadataTableName())
            .where("".concat(qb.escape("type"), " = :type"), { type: type })
            .andWhere("".concat(qb.escape("name"), " = :name"), { name: name });
        if (database) {
            deleteQb.andWhere("".concat(qb.escape("database"), " = :database"), { database: database });
        }
        if (schema) {
            deleteQb.andWhere("".concat(qb.escape("schema"), " = :schema"), { schema: schema });
        }
        if (table) {
            deleteQb.andWhere("".concat(qb.escape("table"), " = :table"), { table: table });
        }
        var _b = (0, tslib_1.__read)(deleteQb.getQueryAndParameters(), 2), query = _b[0], parameters = _b[1];
        return new Query_1.Query(query, parameters);
    };
    /**
     * Checks if at least one of column properties was changed.
     * Does not checks column type, length and autoincrement, because these properties changes separately.
     */
    BaseQueryRunner.prototype.isColumnChanged = function (oldColumn, newColumn, checkDefault, checkComment) {
        // this logs need to debug issues in column change detection. Do not delete it!
        // console.log("charset ---------------");
        // console.log(oldColumn.charset !== newColumn.charset);
        // console.log(oldColumn.charset, newColumn.charset);
        // console.log("collation ---------------");
        // console.log(oldColumn.collation !== newColumn.collation);
        // console.log(oldColumn.collation, newColumn.collation);
        // console.log("precision ---------------");
        // console.log(oldColumn.precision !== newColumn.precision);
        // console.log(oldColumn.precision, newColumn.precision);
        // console.log("scale ---------------");
        // console.log(oldColumn.scale !== newColumn.scale);
        // console.log(oldColumn.scale, newColumn.scale);
        // console.log("default ---------------");
        // console.log((checkDefault && oldColumn.default !== newColumn.default));
        // console.log(oldColumn.default, newColumn.default);
        // console.log("isNullable ---------------");
        // console.log(oldColumn.isNullable !== newColumn.isNullable);
        // console.log(oldColumn.isNullable, newColumn.isNullable);
        // console.log("comment ---------------");
        // console.log((checkComment && oldColumn.comment !== newColumn.comment));
        // console.log(oldColumn.comment, newColumn.comment);
        // console.log("enum ---------------");
        // console.log(!OrmUtils.isArraysEqual(oldColumn.enum || [], newColumn.enum || []));
        // console.log(oldColumn.enum, newColumn.enum);
        return oldColumn.charset !== newColumn.charset
            || oldColumn.collation !== newColumn.collation
            || oldColumn.precision !== newColumn.precision
            || oldColumn.scale !== newColumn.scale
            || oldColumn.width !== newColumn.width // MySQL only
            || oldColumn.zerofill !== newColumn.zerofill // MySQL only
            || oldColumn.unsigned !== newColumn.unsigned // MySQL only
            || oldColumn.asExpression !== newColumn.asExpression // MySQL only
            || (checkDefault && oldColumn.default !== newColumn.default)
            || oldColumn.onUpdate !== newColumn.onUpdate // MySQL only
            || oldColumn.isNullable !== newColumn.isNullable
            || (checkComment && oldColumn.comment !== newColumn.comment)
            || !OrmUtils_1.OrmUtils.isArraysEqual(oldColumn.enum || [], newColumn.enum || []);
    };
    /**
     * Checks if column length is by default.
     */
    BaseQueryRunner.prototype.isDefaultColumnLength = function (table, column, length) {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            var metadata = this.connection.getMetadata(table.name);
            var columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata) {
                var columnMetadataLength = this.connection.driver.getColumnLength(columnMetadata);
                if (columnMetadataLength)
                    return false;
            }
        }
        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].length) {
            return this.connection.driver.dataTypeDefaults[column.type].length.toString() === length.toString();
        }
        return false;
    };
    /**
     * Checks if column precision is by default.
     */
    BaseQueryRunner.prototype.isDefaultColumnPrecision = function (table, column, precision) {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            var metadata = this.connection.getMetadata(table.name);
            var columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.precision !== null && columnMetadata.precision !== undefined)
                return false;
        }
        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].precision !== null
            && this.connection.driver.dataTypeDefaults[column.type].precision !== undefined)
            return this.connection.driver.dataTypeDefaults[column.type].precision === precision;
        return false;
    };
    /**
     * Checks if column scale is by default.
     */
    BaseQueryRunner.prototype.isDefaultColumnScale = function (table, column, scale) {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            var metadata = this.connection.getMetadata(table.name);
            var columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.scale !== null && columnMetadata.scale !== undefined)
                return false;
        }
        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].scale !== null
            && this.connection.driver.dataTypeDefaults[column.type].scale !== undefined)
            return this.connection.driver.dataTypeDefaults[column.type].scale === scale;
        return false;
    };
    /**
     * Executes sql used special for schema build.
     */
    BaseQueryRunner.prototype.executeQueries = function (upQueries, downQueries) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var upQueries_1, upQueries_1_1, _a, query, parameters, e_4_1;
            var _b, _c, e_4, _d;
            return (0, tslib_1.__generator)(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (upQueries instanceof Query_1.Query)
                            upQueries = [upQueries];
                        if (downQueries instanceof Query_1.Query)
                            downQueries = [downQueries];
                        (_b = this.sqlInMemory.upQueries).push.apply(_b, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(upQueries), false));
                        (_c = this.sqlInMemory.downQueries).push.apply(_c, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(downQueries), false));
                        // if sql-in-memory mode is enabled then simply store sql in memory and return
                        if (this.sqlMemoryMode === true)
                            return [2 /*return*/, Promise.resolve()];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 6, 7, 8]);
                        upQueries_1 = (0, tslib_1.__values)(upQueries), upQueries_1_1 = upQueries_1.next();
                        _e.label = 2;
                    case 2:
                        if (!!upQueries_1_1.done) return [3 /*break*/, 5];
                        _a = upQueries_1_1.value, query = _a.query, parameters = _a.parameters;
                        return [4 /*yield*/, this.query(query, parameters)];
                    case 3:
                        _e.sent();
                        _e.label = 4;
                    case 4:
                        upQueries_1_1 = upQueries_1.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_4_1 = _e.sent();
                        e_4 = { error: e_4_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (upQueries_1_1 && !upQueries_1_1.done && (_d = upQueries_1.return)) _d.call(upQueries_1);
                        }
                        finally { if (e_4) throw e_4.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return BaseQueryRunner;
}());
exports.BaseQueryRunner = BaseQueryRunner;

//# sourceMappingURL=BaseQueryRunner.js.map
