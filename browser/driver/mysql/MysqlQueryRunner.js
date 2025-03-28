import { __awaiter, __extends, __generator, __read, __spreadArray, __values } from "tslib";
import { QueryResult } from "../../query-runner/QueryResult";
import { TransactionNotStartedError } from "../../error/TransactionNotStartedError";
import { TableColumn } from "../../schema-builder/table/TableColumn";
import { Table } from "../../schema-builder/table/Table";
import { TableForeignKey } from "../../schema-builder/table/TableForeignKey";
import { TableIndex } from "../../schema-builder/table/TableIndex";
import { QueryRunnerAlreadyReleasedError } from "../../error/QueryRunnerAlreadyReleasedError";
import { View } from "../../schema-builder/view/View";
import { Query } from "../Query";
import { OrmUtils } from "../../util/OrmUtils";
import { QueryFailedError } from "../../error/QueryFailedError";
import { TableUnique } from "../../schema-builder/table/TableUnique";
import { BaseQueryRunner } from "../../query-runner/BaseQueryRunner";
import { Broadcaster } from "../../subscriber/Broadcaster";
import { VersionUtils } from "../../util/VersionUtils";
import { TypeORMError } from "../../error";
import { MetadataTableType } from "../types/MetadataTableType";
/**
 * Runs queries on a single mysql database connection.
 */
var MysqlQueryRunner = /** @class */ (function (_super) {
    __extends(MysqlQueryRunner, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function MysqlQueryRunner(driver, mode) {
        var _this = _super.call(this) || this;
        _this.driver = driver;
        _this.connection = driver.connection;
        _this.broadcaster = new Broadcaster(_this);
        _this.mode = mode;
        return _this;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Creates/uses database connection from the connection pool to perform further operations.
     * Returns obtained database connection.
     */
    MysqlQueryRunner.prototype.connect = function () {
        var _this = this;
        if (this.databaseConnection)
            return Promise.resolve(this.databaseConnection);
        if (this.databaseConnectionPromise)
            return this.databaseConnectionPromise;
        if (this.mode === "slave" && this.driver.isReplicated) {
            this.databaseConnectionPromise = this.driver.obtainSlaveConnection().then(function (connection) {
                _this.databaseConnection = connection;
                return _this.databaseConnection;
            });
        }
        else { // master
            this.databaseConnectionPromise = this.driver.obtainMasterConnection().then(function (connection) {
                _this.databaseConnection = connection;
                return _this.databaseConnection;
            });
        }
        return this.databaseConnectionPromise;
    };
    /**
     * Releases used database connection.
     * You cannot use query runner methods once its released.
     */
    MysqlQueryRunner.prototype.release = function () {
        this.isReleased = true;
        if (this.databaseConnection)
            this.databaseConnection.release();
        return Promise.resolve();
    };
    /**
     * Starts transaction on the current connection.
     */
    MysqlQueryRunner.prototype.startTransaction = function (isolationLevel) {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.isTransactionActive = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.broadcaster.broadcast('BeforeTransactionStart')];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        this.isTransactionActive = false;
                        throw err_1;
                    case 4:
                        if (!(this.transactionDepth === 0)) return [3 /*break*/, 8];
                        if (!isolationLevel) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.query("SET TRANSACTION ISOLATION LEVEL " + isolationLevel)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [4 /*yield*/, this.query("START TRANSACTION")];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.query("SAVEPOINT typeorm_".concat(this.transactionDepth))];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        this.transactionDepth += 1;
                        return [4 /*yield*/, this.broadcaster.broadcast('AfterTransactionStart')];
                    case 11:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    MysqlQueryRunner.prototype.commitTransaction = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isTransactionActive)
                            throw new TransactionNotStartedError();
                        return [4 /*yield*/, this.broadcaster.broadcast('BeforeTransactionCommit')];
                    case 1:
                        _a.sent();
                        if (!(this.transactionDepth > 1)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.query("RELEASE SAVEPOINT typeorm_".concat(this.transactionDepth - 1))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.query("COMMIT")];
                    case 4:
                        _a.sent();
                        this.isTransactionActive = false;
                        _a.label = 5;
                    case 5:
                        this.transactionDepth -= 1;
                        return [4 /*yield*/, this.broadcaster.broadcast('AfterTransactionCommit')];
                    case 6:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Rollbacks transaction.
     * Error will be thrown if transaction was not started.
     */
    MysqlQueryRunner.prototype.rollbackTransaction = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isTransactionActive)
                            throw new TransactionNotStartedError();
                        return [4 /*yield*/, this.broadcaster.broadcast('BeforeTransactionRollback')];
                    case 1:
                        _a.sent();
                        if (!(this.transactionDepth > 1)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.query("ROLLBACK TO SAVEPOINT typeorm_".concat(this.transactionDepth - 1))];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.query("ROLLBACK")];
                    case 4:
                        _a.sent();
                        this.isTransactionActive = false;
                        _a.label = 5;
                    case 5:
                        this.transactionDepth -= 1;
                        return [4 /*yield*/, this.broadcaster.broadcast('AfterTransactionRollback')];
                    case 6:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes a raw SQL query.
     */
    MysqlQueryRunner.prototype.query = function (query, parameters, useStructuredResult) {
        if (useStructuredResult === void 0) { useStructuredResult = false; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.isReleased)
                    throw new QueryRunnerAlreadyReleasedError();
                return [2 /*return*/, new Promise(function (ok, fail) { return __awaiter(_this, void 0, void 0, function () {
                        var databaseConnection, queryStartTime_1, err_2;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, this.connect()];
                                case 1:
                                    databaseConnection = _a.sent();
                                    this.driver.connection.logger.logQuery(query, parameters, this);
                                    queryStartTime_1 = +new Date();
                                    databaseConnection.query(query, parameters, function (err, raw) {
                                        // log slow queries if maxQueryExecution time is set
                                        var maxQueryExecutionTime = _this.driver.options.maxQueryExecutionTime;
                                        var queryEndTime = +new Date();
                                        var queryExecutionTime = queryEndTime - queryStartTime_1;
                                        if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                                            _this.driver.connection.logger.logQuerySlow(queryExecutionTime, query, parameters, _this);
                                        if (err) {
                                            _this.driver.connection.logger.logQueryError(err, query, parameters, _this);
                                            return fail(new QueryFailedError(query, parameters, err));
                                        }
                                        var result = new QueryResult();
                                        result.raw = raw;
                                        try {
                                            result.records = Array.from(raw);
                                        }
                                        catch (_a) {
                                            // Do nothing.
                                        }
                                        if (raw === null || raw === void 0 ? void 0 : raw.hasOwnProperty('affectedRows')) {
                                            result.affected = raw.affectedRows;
                                        }
                                        if (useStructuredResult) {
                                            ok(result);
                                        }
                                        else {
                                            ok(result.raw);
                                        }
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_2 = _a.sent();
                                    fail(err_2);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * Returns raw data stream.
     */
    MysqlQueryRunner.prototype.stream = function (query, parameters, onEnd, onError) {
        var _this = this;
        if (this.isReleased)
            throw new QueryRunnerAlreadyReleasedError();
        return new Promise(function (ok, fail) { return __awaiter(_this, void 0, void 0, function () {
            var databaseConnection, databaseQuery, err_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        databaseConnection = _a.sent();
                        this.driver.connection.logger.logQuery(query, parameters, this);
                        databaseQuery = databaseConnection.query(query, parameters);
                        if (onEnd)
                            databaseQuery.on("end", onEnd);
                        if (onError)
                            databaseQuery.on("error", onError);
                        ok(databaseQuery.stream());
                        return [3 /*break*/, 3];
                    case 2:
                        err_3 = _a.sent();
                        fail(err_3);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    };
    /**
     * Returns all available database names including system databases.
     */
    MysqlQueryRunner.prototype.getDatabases = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.resolve([])];
            });
        });
    };
    /**
     * Returns all available schema names including system schemas.
     * If database parameter specified, returns schemas of that database.
     */
    MysqlQueryRunner.prototype.getSchemas = function (database) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql driver does not support table schemas");
            });
        });
    };
    /**
     * Checks if database with the given name exist.
     */
    MysqlQueryRunner.prototype.hasDatabase = function (database) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("SELECT * FROM `INFORMATION_SCHEMA`.`SCHEMATA` WHERE `SCHEMA_NAME` = '".concat(database, "'"))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length ? true : false];
                }
            });
        });
    };
    /**
     * Loads currently using database
     */
    MysqlQueryRunner.prototype.getCurrentDatabase = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("SELECT DATABASE() AS `db_name`")];
                    case 1:
                        query = _a.sent();
                        return [2 /*return*/, query[0]["db_name"]];
                }
            });
        });
    };
    /**
     * Checks if schema with the given name exist.
     */
    MysqlQueryRunner.prototype.hasSchema = function (schema) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql driver does not support table schemas");
            });
        });
    };
    /**
     * Loads currently using database schema
     */
    MysqlQueryRunner.prototype.getCurrentSchema = function () {
        return __awaiter(this, void 0, void 0, function () {
            var query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("SELECT SCHEMA() AS `schema_name`")];
                    case 1:
                        query = _a.sent();
                        return [2 /*return*/, query[0]["schema_name"]];
                }
            });
        });
    };
    /**
     * Checks if table with the given name exist in the database.
     */
    MysqlQueryRunner.prototype.hasTable = function (tableOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var parsedTableName, sql, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parsedTableName = this.driver.parseTableName(tableOrName);
                        sql = "SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_SCHEMA` = '".concat(parsedTableName.database, "' AND `TABLE_NAME` = '").concat(parsedTableName.tableName, "'");
                        return [4 /*yield*/, this.query(sql)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length ? true : false];
                }
            });
        });
    };
    /**
     * Checks if column with the given name exist in the given table.
     */
    MysqlQueryRunner.prototype.hasColumn = function (tableOrName, column) {
        return __awaiter(this, void 0, void 0, function () {
            var parsedTableName, columnName, sql, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        parsedTableName = this.driver.parseTableName(tableOrName);
                        columnName = column instanceof TableColumn ? column.name : column;
                        sql = "SELECT * FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_SCHEMA` = '".concat(parsedTableName.database, "' AND `TABLE_NAME` = '").concat(parsedTableName.tableName, "' AND `COLUMN_NAME` = '").concat(columnName, "'");
                        return [4 /*yield*/, this.query(sql)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.length ? true : false];
                }
            });
        });
    };
    /**
     * Creates a new database.
     */
    MysqlQueryRunner.prototype.createDatabase = function (database, ifNotExist) {
        return __awaiter(this, void 0, void 0, function () {
            var up, down;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        up = ifNotExist ? "CREATE DATABASE IF NOT EXISTS `".concat(database, "`") : "CREATE DATABASE `".concat(database, "`");
                        down = "DROP DATABASE `".concat(database, "`");
                        return [4 /*yield*/, this.executeQueries(new Query(up), new Query(down))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops database.
     */
    MysqlQueryRunner.prototype.dropDatabase = function (database, ifExist) {
        return __awaiter(this, void 0, void 0, function () {
            var up, down;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        up = ifExist ? "DROP DATABASE IF EXISTS `".concat(database, "`") : "DROP DATABASE `".concat(database, "`");
                        down = "CREATE DATABASE `".concat(database, "`");
                        return [4 /*yield*/, this.executeQueries(new Query(up), new Query(down))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new table schema.
     */
    MysqlQueryRunner.prototype.createSchema = function (schemaPath, ifNotExist) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("Schema create queries are not supported by MySql driver.");
            });
        });
    };
    /**
     * Drops table schema.
     */
    MysqlQueryRunner.prototype.dropSchema = function (schemaPath, ifExist) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("Schema drop queries are not supported by MySql driver.");
            });
        });
    };
    /**
     * Creates a new table.
     */
    MysqlQueryRunner.prototype.createTable = function (table, ifNotExist, createForeignKeys) {
        if (ifNotExist === void 0) { ifNotExist = false; }
        if (createForeignKeys === void 0) { createForeignKeys = true; }
        return __awaiter(this, void 0, void 0, function () {
            var isTableExist, upQueries, downQueries;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!ifNotExist) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hasTable(table)];
                    case 1:
                        isTableExist = _a.sent();
                        if (isTableExist)
                            return [2 /*return*/, Promise.resolve()];
                        _a.label = 2;
                    case 2:
                        upQueries = [];
                        downQueries = [];
                        upQueries.push(this.createTableSql(table, createForeignKeys));
                        downQueries.push(this.dropTableSql(table));
                        // we must first drop indices, than drop foreign keys, because drop queries runs in reversed order
                        // and foreign keys will be dropped first as indices. This order is very important, because we can't drop index
                        // if it related to the foreign key.
                        // createTable does not need separate method to create indices, because it create indices in the same query with table creation.
                        table.indices.forEach(function (index) { return downQueries.push(_this.dropIndexSql(table, index)); });
                        // if createForeignKeys is true, we must drop created foreign keys in down query.
                        // createTable does not need separate method to create foreign keys, because it create fk's in the same query with table creation.
                        if (createForeignKeys)
                            table.foreignKeys.forEach(function (foreignKey) { return downQueries.push(_this.dropForeignKeySql(table, foreignKey)); });
                        return [2 /*return*/, this.executeQueries(upQueries, downQueries)];
                }
            });
        });
    };
    /**
     * Drop the table.
     */
    MysqlQueryRunner.prototype.dropTable = function (target, ifExist, dropForeignKeys) {
        if (dropForeignKeys === void 0) { dropForeignKeys = true; }
        return __awaiter(this, void 0, void 0, function () {
            var isTableExist, createForeignKeys, tablePath, table, upQueries, downQueries;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!ifExist) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hasTable(target)];
                    case 1:
                        isTableExist = _a.sent();
                        if (!isTableExist)
                            return [2 /*return*/, Promise.resolve()];
                        _a.label = 2;
                    case 2:
                        createForeignKeys = dropForeignKeys;
                        tablePath = this.getTablePath(target);
                        return [4 /*yield*/, this.getCachedTable(tablePath)];
                    case 3:
                        table = _a.sent();
                        upQueries = [];
                        downQueries = [];
                        if (dropForeignKeys)
                            table.foreignKeys.forEach(function (foreignKey) { return upQueries.push(_this.dropForeignKeySql(table, foreignKey)); });
                        table.indices.forEach(function (index) { return upQueries.push(_this.dropIndexSql(table, index)); });
                        upQueries.push(this.dropTableSql(table));
                        downQueries.push(this.createTableSql(table, createForeignKeys));
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new view.
     */
    MysqlQueryRunner.prototype.createView = function (view) {
        return __awaiter(this, void 0, void 0, function () {
            var upQueries, downQueries, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        upQueries = [];
                        downQueries = [];
                        upQueries.push(this.createViewSql(view));
                        _b = (_a = upQueries).push;
                        return [4 /*yield*/, this.insertViewDefinitionSql(view)];
                    case 1:
                        _b.apply(_a, [_e.sent()]);
                        downQueries.push(this.dropViewSql(view));
                        _d = (_c = downQueries).push;
                        return [4 /*yield*/, this.deleteViewDefinitionSql(view)];
                    case 2:
                        _d.apply(_c, [_e.sent()]);
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 3:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops the view.
     */
    MysqlQueryRunner.prototype.dropView = function (target) {
        return __awaiter(this, void 0, void 0, function () {
            var viewName, view, upQueries, downQueries, _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        viewName = target instanceof View ? target.name : target;
                        return [4 /*yield*/, this.getCachedView(viewName)];
                    case 1:
                        view = _e.sent();
                        upQueries = [];
                        downQueries = [];
                        _b = (_a = upQueries).push;
                        return [4 /*yield*/, this.deleteViewDefinitionSql(view)];
                    case 2:
                        _b.apply(_a, [_e.sent()]);
                        upQueries.push(this.dropViewSql(view));
                        _d = (_c = downQueries).push;
                        return [4 /*yield*/, this.insertViewDefinitionSql(view)];
                    case 3:
                        _d.apply(_c, [_e.sent()]);
                        downQueries.push(this.createViewSql(view));
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Renames a table.
     */
    MysqlQueryRunner.prototype.renameTable = function (oldTableOrName, newTableName) {
        return __awaiter(this, void 0, void 0, function () {
            var upQueries, downQueries, oldTable, _a, newTable, database;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        upQueries = [];
                        downQueries = [];
                        if (!(oldTableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = oldTableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(oldTableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        oldTable = _a;
                        newTable = oldTable.clone();
                        database = this.driver.parseTableName(oldTable).database;
                        newTable.name = database ? "".concat(database, ".").concat(newTableName) : newTableName;
                        // rename table
                        upQueries.push(new Query("RENAME TABLE ".concat(this.escapePath(oldTable), " TO ").concat(this.escapePath(newTable))));
                        downQueries.push(new Query("RENAME TABLE ".concat(this.escapePath(newTable), " TO ").concat(this.escapePath(oldTable))));
                        // rename index constraints
                        newTable.indices.forEach(function (index) {
                            // build new constraint name
                            var columnNames = index.columnNames.map(function (column) { return "`".concat(column, "`"); }).join(", ");
                            var newIndexName = _this.connection.namingStrategy.indexName(newTable, index.columnNames, index.where);
                            // build queries
                            var indexType = "";
                            if (index.isUnique)
                                indexType += "UNIQUE ";
                            if (index.isSpatial)
                                indexType += "SPATIAL ";
                            if (index.isFulltext)
                                indexType += "FULLTEXT ";
                            var indexParser = index.isFulltext && index.parser ? " WITH PARSER ".concat(index.parser) : "";
                            upQueries.push(new Query("ALTER TABLE ".concat(_this.escapePath(newTable), " DROP INDEX `").concat(index.name, "`, ADD ").concat(indexType, "INDEX `").concat(newIndexName, "` (").concat(columnNames, ")").concat(indexParser)));
                            downQueries.push(new Query("ALTER TABLE ".concat(_this.escapePath(newTable), " DROP INDEX `").concat(newIndexName, "`, ADD ").concat(indexType, "INDEX `").concat(index.name, "` (").concat(columnNames, ")").concat(indexParser)));
                            // replace constraint name
                            index.name = newIndexName;
                        });
                        // rename foreign key constraint
                        newTable.foreignKeys.forEach(function (foreignKey) {
                            // build new constraint name
                            var columnNames = foreignKey.columnNames.map(function (column) { return "`".concat(column, "`"); }).join(", ");
                            var referencedColumnNames = foreignKey.referencedColumnNames.map(function (column) { return "`".concat(column, "`"); }).join(",");
                            var newForeignKeyName = _this.connection.namingStrategy.foreignKeyName(newTable, foreignKey.columnNames, _this.getTablePath(foreignKey), foreignKey.referencedColumnNames);
                            // build queries
                            var up = "ALTER TABLE ".concat(_this.escapePath(newTable), " DROP FOREIGN KEY `").concat(foreignKey.name, "`, ADD CONSTRAINT `").concat(newForeignKeyName, "` FOREIGN KEY (").concat(columnNames, ") ") +
                                "REFERENCES ".concat(_this.escapePath(_this.getTablePath(foreignKey)), "(").concat(referencedColumnNames, ")");
                            if (foreignKey.onDelete)
                                up += " ON DELETE ".concat(foreignKey.onDelete);
                            if (foreignKey.onUpdate)
                                up += " ON UPDATE ".concat(foreignKey.onUpdate);
                            var down = "ALTER TABLE ".concat(_this.escapePath(newTable), " DROP FOREIGN KEY `").concat(newForeignKeyName, "`, ADD CONSTRAINT `").concat(foreignKey.name, "` FOREIGN KEY (").concat(columnNames, ") ") +
                                "REFERENCES ".concat(_this.escapePath(_this.getTablePath(foreignKey)), "(").concat(referencedColumnNames, ")");
                            if (foreignKey.onDelete)
                                down += " ON DELETE ".concat(foreignKey.onDelete);
                            if (foreignKey.onUpdate)
                                down += " ON UPDATE ".concat(foreignKey.onUpdate);
                            upQueries.push(new Query(up));
                            downQueries.push(new Query(down));
                            // replace constraint name
                            foreignKey.name = newForeignKeyName;
                        });
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _b.sent();
                        // rename old table and replace it in cached tabled;
                        oldTable.name = newTable.name;
                        this.replaceCachedTable(oldTable, newTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new column from the column in the table.
     */
    MysqlQueryRunner.prototype.addColumn = function (tableOrName, column) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, clonedTable, upQueries, downQueries, skipColumnLevelPrimary, generatedColumn, nonGeneratedColumn, primaryColumns, columnNames, nonGeneratedColumn, columnIndex, uniqueIndex;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        clonedTable = table.clone();
                        upQueries = [];
                        downQueries = [];
                        skipColumnLevelPrimary = clonedTable.primaryColumns.length > 0;
                        upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD ").concat(this.buildCreateColumnSql(column, skipColumnLevelPrimary, false))));
                        downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP COLUMN `").concat(column.name, "`")));
                        // create or update primary key constraint
                        if (column.isPrimary && skipColumnLevelPrimary) {
                            generatedColumn = clonedTable.columns.find(function (column) { return column.isGenerated && column.generationStrategy === "increment"; });
                            if (generatedColumn) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(column.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(column, true))));
                            }
                            primaryColumns = clonedTable.primaryColumns;
                            columnNames = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                            primaryColumns.push(column);
                            columnNames = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                            // if we previously dropped AUTO_INCREMENT property, we must bring it back
                            if (generatedColumn) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(column, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(column.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                            }
                        }
                        columnIndex = clonedTable.indices.find(function (index) { return index.columnNames.length === 1 && index.columnNames[0] === column.name; });
                        if (columnIndex) {
                            upQueries.push(this.createIndexSql(table, columnIndex));
                            downQueries.push(this.dropIndexSql(table, columnIndex));
                        }
                        else if (column.isUnique) {
                            uniqueIndex = new TableIndex({
                                name: this.connection.namingStrategy.indexName(table, [column.name]),
                                columnNames: [column.name],
                                isUnique: true
                            });
                            clonedTable.indices.push(uniqueIndex);
                            clonedTable.uniques.push(new TableUnique({
                                name: uniqueIndex.name,
                                columnNames: uniqueIndex.columnNames
                            }));
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD UNIQUE INDEX `").concat(uniqueIndex.name, "` (`").concat(column.name, "`)")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP INDEX `").concat(uniqueIndex.name, "`")));
                        }
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _b.sent();
                        clonedTable.addColumn(column);
                        this.replaceCachedTable(table, clonedTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new columns from the column in the table.
     */
    MysqlQueryRunner.prototype.addColumns = function (tableOrName, columns) {
        return __awaiter(this, void 0, void 0, function () {
            var columns_1, columns_1_1, column, e_1_1;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, 6, 7]);
                        columns_1 = __values(columns), columns_1_1 = columns_1.next();
                        _b.label = 1;
                    case 1:
                        if (!!columns_1_1.done) return [3 /*break*/, 4];
                        column = columns_1_1.value;
                        return [4 /*yield*/, this.addColumn(tableOrName, column)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        columns_1_1 = columns_1.next();
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 7];
                    case 6:
                        try {
                            if (columns_1_1 && !columns_1_1.done && (_a = columns_1.return)) _a.call(columns_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Renames column in the given table.
     */
    MysqlQueryRunner.prototype.renameColumn = function (tableOrName, oldTableColumnOrName, newTableColumnOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, oldColumn, newColumn;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        oldColumn = oldTableColumnOrName instanceof TableColumn ? oldTableColumnOrName : table.columns.find(function (c) { return c.name === oldTableColumnOrName; });
                        if (!oldColumn)
                            throw new TypeORMError("Column \"".concat(oldTableColumnOrName, "\" was not found in the \"").concat(table.name, "\" table."));
                        newColumn = undefined;
                        if (newTableColumnOrName instanceof TableColumn) {
                            newColumn = newTableColumnOrName;
                        }
                        else {
                            newColumn = oldColumn.clone();
                            newColumn.name = newTableColumnOrName;
                        }
                        return [4 /*yield*/, this.changeColumn(table, oldColumn, newColumn)];
                    case 4:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Changes a column in the table.
     */
    MysqlQueryRunner.prototype.changeColumn = function (tableOrName, oldColumnOrName, newColumn) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, clonedTable, upQueries, downQueries, oldColumn, oldTableColumn, generatedColumn, nonGeneratedColumn, primaryColumns, columnNames, column, columnNames, primaryColumn, column, columnNames, nonGeneratedColumn, uniqueIndex, uniqueIndex_1, tableUnique;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        clonedTable = table.clone();
                        upQueries = [];
                        downQueries = [];
                        oldColumn = oldColumnOrName instanceof TableColumn
                            ? oldColumnOrName
                            : table.columns.find(function (column) { return column.name === oldColumnOrName; });
                        if (!oldColumn)
                            throw new TypeORMError("Column \"".concat(oldColumnOrName, "\" was not found in the \"").concat(table.name, "\" table."));
                        if (!((newColumn.isGenerated !== oldColumn.isGenerated && newColumn.generationStrategy !== "uuid")
                            || oldColumn.type !== newColumn.type
                            || oldColumn.length !== newColumn.length
                            || oldColumn.generatedType !== newColumn.generatedType)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.dropColumn(table, oldColumn)];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, this.addColumn(table, newColumn)];
                    case 5:
                        _b.sent();
                        // update cloned table
                        clonedTable = table.clone();
                        return [3 /*break*/, 7];
                    case 6:
                        if (newColumn.name !== oldColumn.name) {
                            // We don't change any column properties, just rename it.
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(oldColumn.name, "` `").concat(newColumn.name, "` ").concat(this.buildCreateColumnSql(oldColumn, true, true))));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(newColumn.name, "` `").concat(oldColumn.name, "` ").concat(this.buildCreateColumnSql(oldColumn, true, true))));
                            // rename index constraints
                            clonedTable.findColumnIndices(oldColumn).forEach(function (index) {
                                // build new constraint name
                                index.columnNames.splice(index.columnNames.indexOf(oldColumn.name), 1);
                                index.columnNames.push(newColumn.name);
                                var columnNames = index.columnNames.map(function (column) { return "`".concat(column, "`"); }).join(", ");
                                var newIndexName = _this.connection.namingStrategy.indexName(clonedTable, index.columnNames, index.where);
                                // build queries
                                var indexType = "";
                                if (index.isUnique)
                                    indexType += "UNIQUE ";
                                if (index.isSpatial)
                                    indexType += "SPATIAL ";
                                if (index.isFulltext)
                                    indexType += "FULLTEXT ";
                                var indexParser = index.isFulltext && index.parser ? " WITH PARSER ".concat(index.parser) : "";
                                upQueries.push(new Query("ALTER TABLE ".concat(_this.escapePath(table), " DROP INDEX `").concat(index.name, "`, ADD ").concat(indexType, "INDEX `").concat(newIndexName, "` (").concat(columnNames, ")").concat(indexParser)));
                                downQueries.push(new Query("ALTER TABLE ".concat(_this.escapePath(table), " DROP INDEX `").concat(newIndexName, "`, ADD ").concat(indexType, "INDEX `").concat(index.name, "` (").concat(columnNames, ")").concat(indexParser)));
                                // replace constraint name
                                index.name = newIndexName;
                            });
                            // rename foreign key constraints
                            clonedTable.findColumnForeignKeys(oldColumn).forEach(function (foreignKey) {
                                // build new constraint name
                                foreignKey.columnNames.splice(foreignKey.columnNames.indexOf(oldColumn.name), 1);
                                foreignKey.columnNames.push(newColumn.name);
                                var columnNames = foreignKey.columnNames.map(function (column) { return "`".concat(column, "`"); }).join(", ");
                                var referencedColumnNames = foreignKey.referencedColumnNames.map(function (column) { return "`".concat(column, "`"); }).join(",");
                                var newForeignKeyName = _this.connection.namingStrategy.foreignKeyName(clonedTable, foreignKey.columnNames, _this.getTablePath(foreignKey), foreignKey.referencedColumnNames);
                                // build queries
                                var up = "ALTER TABLE ".concat(_this.escapePath(table), " DROP FOREIGN KEY `").concat(foreignKey.name, "`, ADD CONSTRAINT `").concat(newForeignKeyName, "` FOREIGN KEY (").concat(columnNames, ") ") +
                                    "REFERENCES ".concat(_this.escapePath(_this.getTablePath(foreignKey)), "(").concat(referencedColumnNames, ")");
                                if (foreignKey.onDelete)
                                    up += " ON DELETE ".concat(foreignKey.onDelete);
                                if (foreignKey.onUpdate)
                                    up += " ON UPDATE ".concat(foreignKey.onUpdate);
                                var down = "ALTER TABLE ".concat(_this.escapePath(table), " DROP FOREIGN KEY `").concat(newForeignKeyName, "`, ADD CONSTRAINT `").concat(foreignKey.name, "` FOREIGN KEY (").concat(columnNames, ") ") +
                                    "REFERENCES ".concat(_this.escapePath(_this.getTablePath(foreignKey)), "(").concat(referencedColumnNames, ")");
                                if (foreignKey.onDelete)
                                    down += " ON DELETE ".concat(foreignKey.onDelete);
                                if (foreignKey.onUpdate)
                                    down += " ON UPDATE ".concat(foreignKey.onUpdate);
                                upQueries.push(new Query(up));
                                downQueries.push(new Query(down));
                                // replace constraint name
                                foreignKey.name = newForeignKeyName;
                            });
                            oldTableColumn = clonedTable.columns.find(function (column) { return column.name === oldColumn.name; });
                            clonedTable.columns[clonedTable.columns.indexOf(oldTableColumn)].name = newColumn.name;
                            oldColumn.name = newColumn.name;
                        }
                        if (this.isColumnChanged(oldColumn, newColumn, true, true)) {
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(oldColumn.name, "` ").concat(this.buildCreateColumnSql(newColumn, true))));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(newColumn.name, "` ").concat(this.buildCreateColumnSql(oldColumn, true))));
                        }
                        if (newColumn.isPrimary !== oldColumn.isPrimary) {
                            generatedColumn = clonedTable.columns.find(function (column) { return column.isGenerated && column.generationStrategy === "increment"; });
                            if (generatedColumn) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(generatedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(generatedColumn, true))));
                            }
                            primaryColumns = clonedTable.primaryColumns;
                            // if primary column state changed, we must always drop existed constraint.
                            if (primaryColumns.length > 0) {
                                columnNames = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                            }
                            if (newColumn.isPrimary === true) {
                                primaryColumns.push(newColumn);
                                column = clonedTable.columns.find(function (column) { return column.name === newColumn.name; });
                                column.isPrimary = true;
                                columnNames = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                            }
                            else {
                                primaryColumn = primaryColumns.find(function (c) { return c.name === newColumn.name; });
                                primaryColumns.splice(primaryColumns.indexOf(primaryColumn), 1);
                                column = clonedTable.columns.find(function (column) { return column.name === newColumn.name; });
                                column.isPrimary = false;
                                // if we have another primary keys, we must recreate constraint.
                                if (primaryColumns.length > 0) {
                                    columnNames = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                                    upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                                    downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                                }
                            }
                            // if we have generated column, and we dropped AUTO_INCREMENT property before, we must bring it back
                            if (generatedColumn) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(generatedColumn, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(generatedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                            }
                        }
                        if (newColumn.isUnique !== oldColumn.isUnique) {
                            if (newColumn.isUnique === true) {
                                uniqueIndex = new TableIndex({
                                    name: this.connection.namingStrategy.indexName(table, [newColumn.name]),
                                    columnNames: [newColumn.name],
                                    isUnique: true
                                });
                                clonedTable.indices.push(uniqueIndex);
                                clonedTable.uniques.push(new TableUnique({
                                    name: uniqueIndex.name,
                                    columnNames: uniqueIndex.columnNames
                                }));
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD UNIQUE INDEX `").concat(uniqueIndex.name, "` (`").concat(newColumn.name, "`)")));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP INDEX `").concat(uniqueIndex.name, "`")));
                            }
                            else {
                                uniqueIndex_1 = clonedTable.indices.find(function (index) {
                                    return index.columnNames.length === 1 && index.isUnique === true && !!index.columnNames.find(function (columnName) { return columnName === newColumn.name; });
                                });
                                clonedTable.indices.splice(clonedTable.indices.indexOf(uniqueIndex_1), 1);
                                tableUnique = clonedTable.uniques.find(function (unique) { return unique.name === uniqueIndex_1.name; });
                                clonedTable.uniques.splice(clonedTable.uniques.indexOf(tableUnique), 1);
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP INDEX `").concat(uniqueIndex_1.name, "`")));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD UNIQUE INDEX `").concat(uniqueIndex_1.name, "` (`").concat(newColumn.name, "`)")));
                            }
                        }
                        _b.label = 7;
                    case 7: return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 8:
                        _b.sent();
                        this.replaceCachedTable(table, clonedTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Changes a column in the table.
     */
    MysqlQueryRunner.prototype.changeColumns = function (tableOrName, changedColumns) {
        return __awaiter(this, void 0, void 0, function () {
            var changedColumns_1, changedColumns_1_1, _a, oldColumn, newColumn, e_2_1;
            var e_2, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 5, 6, 7]);
                        changedColumns_1 = __values(changedColumns), changedColumns_1_1 = changedColumns_1.next();
                        _c.label = 1;
                    case 1:
                        if (!!changedColumns_1_1.done) return [3 /*break*/, 4];
                        _a = changedColumns_1_1.value, oldColumn = _a.oldColumn, newColumn = _a.newColumn;
                        return [4 /*yield*/, this.changeColumn(tableOrName, oldColumn, newColumn)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        changedColumns_1_1 = changedColumns_1.next();
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        e_2_1 = _c.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 7];
                    case 6:
                        try {
                            if (changedColumns_1_1 && !changedColumns_1_1.done && (_b = changedColumns_1.return)) _b.call(changedColumns_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops column in the table.
     */
    MysqlQueryRunner.prototype.dropColumn = function (tableOrName, columnOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, column, clonedTable, upQueries, downQueries, generatedColumn, nonGeneratedColumn, columnNames, tableColumn, columnNames_1, nonGeneratedColumn, columnIndex, uniqueName_1, foundUnique, indexName_1, foundIndex;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        column = columnOrName instanceof TableColumn ? columnOrName : table.findColumnByName(columnOrName);
                        if (!column)
                            throw new TypeORMError("Column \"".concat(columnOrName, "\" was not found in table \"").concat(table.name, "\""));
                        clonedTable = table.clone();
                        upQueries = [];
                        downQueries = [];
                        // drop primary key constraint
                        if (column.isPrimary) {
                            generatedColumn = clonedTable.columns.find(function (column) { return column.isGenerated && column.generationStrategy === "increment"; });
                            if (generatedColumn) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(generatedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(generatedColumn, true))));
                            }
                            columnNames = clonedTable.primaryColumns.map(function (primaryColumn) { return "`".concat(primaryColumn.name, "`"); }).join(", ");
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(clonedTable), " DROP PRIMARY KEY")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(clonedTable), " ADD PRIMARY KEY (").concat(columnNames, ")")));
                            tableColumn = clonedTable.findColumnByName(column.name);
                            tableColumn.isPrimary = false;
                            // if primary key have multiple columns, we must recreate it without dropped column
                            if (clonedTable.primaryColumns.length > 0) {
                                columnNames_1 = clonedTable.primaryColumns.map(function (primaryColumn) { return "`".concat(primaryColumn.name, "`"); }).join(", ");
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(clonedTable), " ADD PRIMARY KEY (").concat(columnNames_1, ")")));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(clonedTable), " DROP PRIMARY KEY")));
                            }
                            // if we have generated column, and we dropped AUTO_INCREMENT property before, and this column is not current dropping column, we must bring it back
                            if (generatedColumn && generatedColumn.name !== column.name) {
                                nonGeneratedColumn = generatedColumn.clone();
                                nonGeneratedColumn.isGenerated = false;
                                nonGeneratedColumn.generationStrategy = undefined;
                                upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(generatedColumn, true))));
                                downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(generatedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                            }
                        }
                        columnIndex = clonedTable.indices.find(function (index) { return index.columnNames.length === 1 && index.columnNames[0] === column.name; });
                        if (columnIndex) {
                            clonedTable.indices.splice(clonedTable.indices.indexOf(columnIndex), 1);
                            upQueries.push(this.dropIndexSql(table, columnIndex));
                            downQueries.push(this.createIndexSql(table, columnIndex));
                        }
                        else if (column.isUnique) {
                            uniqueName_1 = this.connection.namingStrategy.uniqueConstraintName(table, [column.name]);
                            foundUnique = clonedTable.uniques.find(function (unique) { return unique.name === uniqueName_1; });
                            if (foundUnique)
                                clonedTable.uniques.splice(clonedTable.uniques.indexOf(foundUnique), 1);
                            indexName_1 = this.connection.namingStrategy.indexName(table, [column.name]);
                            foundIndex = clonedTable.indices.find(function (index) { return index.name === indexName_1; });
                            if (foundIndex)
                                clonedTable.indices.splice(clonedTable.indices.indexOf(foundIndex), 1);
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP INDEX `").concat(indexName_1, "`")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD UNIQUE INDEX `").concat(indexName_1, "` (`").concat(column.name, "`)")));
                        }
                        upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP COLUMN `").concat(column.name, "`")));
                        downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD ").concat(this.buildCreateColumnSql(column, true))));
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _b.sent();
                        clonedTable.removeColumn(column);
                        this.replaceCachedTable(table, clonedTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops the columns in the table.
     */
    MysqlQueryRunner.prototype.dropColumns = function (tableOrName, columns) {
        return __awaiter(this, void 0, void 0, function () {
            var columns_2, columns_2_1, column, e_3_1;
            var e_3, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, 6, 7]);
                        columns_2 = __values(columns), columns_2_1 = columns_2.next();
                        _b.label = 1;
                    case 1:
                        if (!!columns_2_1.done) return [3 /*break*/, 4];
                        column = columns_2_1.value;
                        return [4 /*yield*/, this.dropColumn(tableOrName, column)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        columns_2_1 = columns_2.next();
                        return [3 /*break*/, 1];
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        e_3_1 = _b.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 7];
                    case 6:
                        try {
                            if (columns_2_1 && !columns_2_1.done && (_a = columns_2.return)) _a.call(columns_2);
                        }
                        finally { if (e_3) throw e_3.error; }
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new primary key.
     */
    MysqlQueryRunner.prototype.createPrimaryKey = function (tableOrName, columnNames) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, clonedTable, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        clonedTable = table.clone();
                        up = this.createPrimaryKeySql(table, columnNames);
                        down = this.dropPrimaryKeySql(table);
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        clonedTable.columns.forEach(function (column) {
                            if (columnNames.find(function (columnName) { return columnName === column.name; }))
                                column.isPrimary = true;
                        });
                        this.replaceCachedTable(table, clonedTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Updates composite primary keys.
     */
    MysqlQueryRunner.prototype.updatePrimaryKeys = function (tableOrName, columns) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, clonedTable, columnNames, upQueries, downQueries, generatedColumn, nonGeneratedColumn, primaryColumns, columnNames_2, columnNamesString, newOrExistGeneratedColumn, nonGeneratedColumn, changedGeneratedColumn;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        clonedTable = table.clone();
                        columnNames = columns.map(function (column) { return column.name; });
                        upQueries = [];
                        downQueries = [];
                        generatedColumn = clonedTable.columns.find(function (column) { return column.isGenerated && column.generationStrategy === "increment"; });
                        if (generatedColumn) {
                            nonGeneratedColumn = generatedColumn.clone();
                            nonGeneratedColumn.isGenerated = false;
                            nonGeneratedColumn.generationStrategy = undefined;
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(generatedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(generatedColumn, true))));
                        }
                        primaryColumns = clonedTable.primaryColumns;
                        if (primaryColumns.length > 0) {
                            columnNames_2 = primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNames_2, ")")));
                        }
                        // update columns in table.
                        clonedTable.columns
                            .filter(function (column) { return columnNames.indexOf(column.name) !== -1; })
                            .forEach(function (column) { return column.isPrimary = true; });
                        columnNamesString = columnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
                        upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNamesString, ")")));
                        downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY")));
                        newOrExistGeneratedColumn = generatedColumn ? generatedColumn : columns.find(function (column) { return column.isGenerated && column.generationStrategy === "increment"; });
                        if (newOrExistGeneratedColumn) {
                            nonGeneratedColumn = newOrExistGeneratedColumn.clone();
                            nonGeneratedColumn.isGenerated = false;
                            nonGeneratedColumn.generationStrategy = undefined;
                            upQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(nonGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(newOrExistGeneratedColumn, true))));
                            downQueries.push(new Query("ALTER TABLE ".concat(this.escapePath(table), " CHANGE `").concat(newOrExistGeneratedColumn.name, "` ").concat(this.buildCreateColumnSql(nonGeneratedColumn, true))));
                            changedGeneratedColumn = clonedTable.columns.find(function (column) { return column.name === newOrExistGeneratedColumn.name; });
                            changedGeneratedColumn.isGenerated = true;
                            changedGeneratedColumn.generationStrategy = "increment";
                        }
                        return [4 /*yield*/, this.executeQueries(upQueries, downQueries)];
                    case 4:
                        _b.sent();
                        this.replaceCachedTable(table, clonedTable);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops a primary key.
     */
    MysqlQueryRunner.prototype.dropPrimaryKey = function (tableOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        up = this.dropPrimaryKeySql(table);
                        down = this.createPrimaryKeySql(table, table.primaryColumns.map(function (column) { return column.name; }));
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        table.primaryColumns.forEach(function (column) {
                            column.isPrimary = false;
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new unique constraint.
     */
    MysqlQueryRunner.prototype.createUniqueConstraint = function (tableOrName, uniqueConstraint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support unique constraints. Use unique index instead.");
            });
        });
    };
    /**
     * Creates a new unique constraints.
     */
    MysqlQueryRunner.prototype.createUniqueConstraints = function (tableOrName, uniqueConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support unique constraints. Use unique index instead.");
            });
        });
    };
    /**
     * Drops an unique constraint.
     */
    MysqlQueryRunner.prototype.dropUniqueConstraint = function (tableOrName, uniqueOrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support unique constraints. Use unique index instead.");
            });
        });
    };
    /**
     * Drops an unique constraints.
     */
    MysqlQueryRunner.prototype.dropUniqueConstraints = function (tableOrName, uniqueConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support unique constraints. Use unique index instead.");
            });
        });
    };
    /**
     * Creates a new check constraint.
     */
    MysqlQueryRunner.prototype.createCheckConstraint = function (tableOrName, checkConstraint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support check constraints.");
            });
        });
    };
    /**
     * Creates a new check constraints.
     */
    MysqlQueryRunner.prototype.createCheckConstraints = function (tableOrName, checkConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support check constraints.");
            });
        });
    };
    /**
     * Drops check constraint.
     */
    MysqlQueryRunner.prototype.dropCheckConstraint = function (tableOrName, checkOrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support check constraints.");
            });
        });
    };
    /**
     * Drops check constraints.
     */
    MysqlQueryRunner.prototype.dropCheckConstraints = function (tableOrName, checkConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support check constraints.");
            });
        });
    };
    /**
     * Creates a new exclusion constraint.
     */
    MysqlQueryRunner.prototype.createExclusionConstraint = function (tableOrName, exclusionConstraint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support exclusion constraints.");
            });
        });
    };
    /**
     * Creates a new exclusion constraints.
     */
    MysqlQueryRunner.prototype.createExclusionConstraints = function (tableOrName, exclusionConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support exclusion constraints.");
            });
        });
    };
    /**
     * Drops exclusion constraint.
     */
    MysqlQueryRunner.prototype.dropExclusionConstraint = function (tableOrName, exclusionOrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support exclusion constraints.");
            });
        });
    };
    /**
     * Drops exclusion constraints.
     */
    MysqlQueryRunner.prototype.dropExclusionConstraints = function (tableOrName, exclusionConstraints) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new TypeORMError("MySql does not support exclusion constraints.");
            });
        });
    };
    /**
     * Creates a new foreign key.
     */
    MysqlQueryRunner.prototype.createForeignKey = function (tableOrName, foreignKey) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        // new FK may be passed without name. In this case we generate FK name manually.
                        if (!foreignKey.name)
                            foreignKey.name = this.connection.namingStrategy.foreignKeyName(table, foreignKey.columnNames, this.getTablePath(foreignKey), foreignKey.referencedColumnNames);
                        up = this.createForeignKeySql(table, foreignKey);
                        down = this.dropForeignKeySql(table, foreignKey);
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        table.addForeignKey(foreignKey);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new foreign keys.
     */
    MysqlQueryRunner.prototype.createForeignKeys = function (tableOrName, foreignKeys) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = foreignKeys.map(function (foreignKey) { return _this.createForeignKey(tableOrName, foreignKey); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops a foreign key.
     */
    MysqlQueryRunner.prototype.dropForeignKey = function (tableOrName, foreignKeyOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, foreignKey, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        foreignKey = foreignKeyOrName instanceof TableForeignKey ? foreignKeyOrName : table.foreignKeys.find(function (fk) { return fk.name === foreignKeyOrName; });
                        if (!foreignKey)
                            throw new TypeORMError("Supplied foreign key was not found in table ".concat(table.name));
                        up = this.dropForeignKeySql(table, foreignKey);
                        down = this.createForeignKeySql(table, foreignKey);
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        table.removeForeignKey(foreignKey);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops a foreign keys from the table.
     */
    MysqlQueryRunner.prototype.dropForeignKeys = function (tableOrName, foreignKeys) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = foreignKeys.map(function (foreignKey) { return _this.dropForeignKey(tableOrName, foreignKey); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new index.
     */
    MysqlQueryRunner.prototype.createIndex = function (tableOrName, index) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        // new index may be passed without name. In this case we generate index name manually.
                        if (!index.name)
                            index.name = this.connection.namingStrategy.indexName(table, index.columnNames, index.where);
                        up = this.createIndexSql(table, index);
                        down = this.dropIndexSql(table, index);
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        table.addIndex(index, true);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Creates a new indices
     */
    MysqlQueryRunner.prototype.createIndices = function (tableOrName, indices) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = indices.map(function (index) { return _this.createIndex(tableOrName, index); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops an index.
     */
    MysqlQueryRunner.prototype.dropIndex = function (tableOrName, indexOrName) {
        return __awaiter(this, void 0, void 0, function () {
            var table, _a, index, up, down;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(tableOrName instanceof Table)) return [3 /*break*/, 1];
                        _a = tableOrName;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.getCachedTable(tableOrName)];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        table = _a;
                        index = indexOrName instanceof TableIndex ? indexOrName : table.indices.find(function (i) { return i.name === indexOrName; });
                        if (!index)
                            throw new TypeORMError("Supplied index ".concat(indexOrName, " was not found in table ").concat(table.name));
                        up = this.dropIndexSql(table, index);
                        down = this.createIndexSql(table, index);
                        return [4 /*yield*/, this.executeQueries(up, down)];
                    case 4:
                        _b.sent();
                        table.removeIndex(index, true);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Drops an indices from the table.
     */
    MysqlQueryRunner.prototype.dropIndices = function (tableOrName, indices) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = indices.map(function (index) { return _this.dropIndex(tableOrName, index); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clears all table contents.
     * Note: this operation uses SQL's TRUNCATE query which cannot be reverted in transactions.
     */
    MysqlQueryRunner.prototype.clearTable = function (tableOrName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("TRUNCATE TABLE ".concat(this.escapePath(tableOrName)))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Removes all tables from the currently connected database.
     * Be careful using this method and avoid using it in production or migrations
     * (because it can clear all your database).
     */
    MysqlQueryRunner.prototype.clearDatabase = function (database) {
        return __awaiter(this, void 0, void 0, function () {
            var dbName, isDatabaseExist, isAnotherTransactionActive, selectViewDropsQuery, dropViewQueries, disableForeignKeysCheckQuery, dropTablesQuery, enableForeignKeysCheckQuery, dropQueries, error_1, rollbackError_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dbName = database ? database : this.driver.database;
                        if (!dbName) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.hasDatabase(dbName)];
                    case 1:
                        isDatabaseExist = _a.sent();
                        if (!isDatabaseExist)
                            return [2 /*return*/, Promise.resolve()];
                        return [3 /*break*/, 3];
                    case 2: throw new TypeORMError("Can not clear database. No database is specified");
                    case 3:
                        isAnotherTransactionActive = this.isTransactionActive;
                        if (!!isAnotherTransactionActive) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.startTransaction()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 14, , 20]);
                        selectViewDropsQuery = "SELECT concat('DROP VIEW IF EXISTS `', table_schema, '`.`', table_name, '`') AS `query` FROM `INFORMATION_SCHEMA`.`VIEWS` WHERE `TABLE_SCHEMA` = '".concat(dbName, "'");
                        return [4 /*yield*/, this.query(selectViewDropsQuery)];
                    case 6:
                        dropViewQueries = _a.sent();
                        return [4 /*yield*/, Promise.all(dropViewQueries.map(function (q) { return _this.query(q["query"]); }))];
                    case 7:
                        _a.sent();
                        disableForeignKeysCheckQuery = "SET FOREIGN_KEY_CHECKS = 0;";
                        dropTablesQuery = "SELECT concat('DROP TABLE IF EXISTS `', table_schema, '`.`', table_name, '`') AS `query` FROM `INFORMATION_SCHEMA`.`TABLES` WHERE `TABLE_SCHEMA` = '".concat(dbName, "'");
                        enableForeignKeysCheckQuery = "SET FOREIGN_KEY_CHECKS = 1;";
                        return [4 /*yield*/, this.query(disableForeignKeysCheckQuery)];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.query(dropTablesQuery)];
                    case 9:
                        dropQueries = _a.sent();
                        return [4 /*yield*/, Promise.all(dropQueries.map(function (query) { return _this.query(query["query"]); }))];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, this.query(enableForeignKeysCheckQuery)];
                    case 11:
                        _a.sent();
                        if (!!isAnotherTransactionActive) return [3 /*break*/, 13];
                        return [4 /*yield*/, this.commitTransaction()];
                    case 12:
                        _a.sent();
                        _a.label = 13;
                    case 13: return [3 /*break*/, 20];
                    case 14:
                        error_1 = _a.sent();
                        _a.label = 15;
                    case 15:
                        _a.trys.push([15, 18, , 19]);
                        if (!!isAnotherTransactionActive) return [3 /*break*/, 17];
                        return [4 /*yield*/, this.rollbackTransaction()];
                    case 16:
                        _a.sent();
                        _a.label = 17;
                    case 17: return [3 /*break*/, 19];
                    case 18:
                        rollbackError_1 = _a.sent();
                        return [3 /*break*/, 19];
                    case 19: throw error_1;
                    case 20: return [2 /*return*/];
                }
            });
        });
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    MysqlQueryRunner.prototype.loadViews = function (viewNames) {
        return __awaiter(this, void 0, void 0, function () {
            var hasTable, currentDatabase, viewsCondition, query, dbViews;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.hasTable(this.getTypeormMetadataTableName())];
                    case 1:
                        hasTable = _a.sent();
                        if (!hasTable) {
                            return [2 /*return*/, []];
                        }
                        if (!viewNames) {
                            viewNames = [];
                        }
                        return [4 /*yield*/, this.getCurrentDatabase()];
                    case 2:
                        currentDatabase = _a.sent();
                        viewsCondition = viewNames.map(function (tableName) {
                            var _a = _this.driver.parseTableName(tableName), database = _a.database, name = _a.tableName;
                            if (!database) {
                                database = currentDatabase;
                            }
                            return "(`t`.`schema` = '".concat(database, "' AND `t`.`name` = '").concat(name, "')");
                        }).join(" OR ");
                        query = "SELECT `t`.*, `v`.`check_option` FROM ".concat(this.escapePath(this.getTypeormMetadataTableName()), " `t` ") +
                            "INNER JOIN `information_schema`.`views` `v` ON `v`.`table_schema` = `t`.`schema` AND `v`.`table_name` = `t`.`name` WHERE `t`.`type` = '".concat(MetadataTableType.VIEW, "' ").concat(viewsCondition ? "AND (".concat(viewsCondition, ")") : "");
                        return [4 /*yield*/, this.query(query)];
                    case 3:
                        dbViews = _a.sent();
                        return [2 /*return*/, dbViews.map(function (dbView) {
                                var view = new View();
                                var db = dbView["schema"] === currentDatabase ? undefined : dbView["schema"];
                                view.database = dbView["schema"];
                                view.name = _this.driver.buildTableName(dbView["name"], undefined, db);
                                view.expression = dbView["value"];
                                return view;
                            })];
                }
            });
        });
    };
    /**
     * Loads all tables (with given names) from the database and creates a Table from them.
     */
    MysqlQueryRunner.prototype.loadTables = function (tableNames) {
        return __awaiter(this, void 0, void 0, function () {
            var currentDatabase, dbTables, tablesSql, _a, _b, _c, _d, tablesSql, _e, _f, _g, _h, statsSubquerySql, kcuSubquerySql, rcSubquerySql, columnsSql, collationsSql, primaryKeySql, indicesSql, foreignKeysSql, _j, dbColumns, dbPrimaryKeys, dbCollations, dbIndices, dbForeignKeys, isMariaDb, dbVersion;
            var _this = this;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        if (tableNames && tableNames.length === 0) {
                            return [2 /*return*/, []];
                        }
                        return [4 /*yield*/, this.getCurrentDatabase()];
                    case 1:
                        currentDatabase = _k.sent();
                        dbTables = [];
                        if (!!tableNames) return [3 /*break*/, 3];
                        tablesSql = "SELECT `TABLE_SCHEMA`, `TABLE_NAME` FROM `INFORMATION_SCHEMA`.`TABLES`";
                        _b = (_a = dbTables.push).apply;
                        _c = [dbTables];
                        _d = [[]];
                        return [4 /*yield*/, this.query(tablesSql)];
                    case 2:
                        _b.apply(_a, _c.concat([__spreadArray.apply(void 0, _d.concat([__read.apply(void 0, [_k.sent()]), false]))]));
                        return [3 /*break*/, 5];
                    case 3:
                        tablesSql = tableNames
                            .filter(function (tableName) { return tableName; })
                            .map(function (tableName) {
                            var _a = _this.driver.parseTableName(tableName), database = _a.database, name = _a.tableName;
                            if (!database) {
                                database = currentDatabase;
                            }
                            return "\n                        SELECT `TABLE_SCHEMA`,\n                               `TABLE_NAME`\n                        FROM `INFORMATION_SCHEMA`.`TABLES`\n                        WHERE `TABLE_SCHEMA` = '".concat(database, "'\n                          AND `TABLE_NAME` = '").concat(name, "'\n                    ");
                        }).join(" UNION ");
                        _f = (_e = dbTables.push).apply;
                        _g = [dbTables];
                        _h = [[]];
                        return [4 /*yield*/, this.query(tablesSql)];
                    case 4:
                        _f.apply(_e, _g.concat([__spreadArray.apply(void 0, _h.concat([__read.apply(void 0, [_k.sent()]), false]))]));
                        _k.label = 5;
                    case 5:
                        // if tables were not found in the db, no need to proceed
                        if (!dbTables.length)
                            return [2 /*return*/, []];
                        statsSubquerySql = dbTables.map(function (_a) {
                            var TABLE_SCHEMA = _a.TABLE_SCHEMA, TABLE_NAME = _a.TABLE_NAME;
                            return "\n                SELECT\n                    *\n                FROM `INFORMATION_SCHEMA`.`STATISTICS`\n                WHERE\n                    `TABLE_SCHEMA` = '".concat(TABLE_SCHEMA, "'\n                    AND\n                    `TABLE_NAME` = '").concat(TABLE_NAME, "'\n            ");
                        }).join(" UNION ");
                        kcuSubquerySql = dbTables.map(function (_a) {
                            var TABLE_SCHEMA = _a.TABLE_SCHEMA, TABLE_NAME = _a.TABLE_NAME;
                            return "\n                SELECT\n                    *\n                FROM `INFORMATION_SCHEMA`.`KEY_COLUMN_USAGE` `kcu`\n                WHERE\n                    `kcu`.`TABLE_SCHEMA` = '".concat(TABLE_SCHEMA, "'\n                    AND\n                    `kcu`.`TABLE_NAME` = '").concat(TABLE_NAME, "'\n            ");
                        }).join(" UNION ");
                        rcSubquerySql = dbTables.map(function (_a) {
                            var TABLE_SCHEMA = _a.TABLE_SCHEMA, TABLE_NAME = _a.TABLE_NAME;
                            return "\n                SELECT\n                    *\n                FROM `INFORMATION_SCHEMA`.`REFERENTIAL_CONSTRAINTS`\n                WHERE\n                    `CONSTRAINT_SCHEMA` = '".concat(TABLE_SCHEMA, "'\n                    AND\n                    `TABLE_NAME` = '").concat(TABLE_NAME, "'\n            ");
                        }).join(" UNION ");
                        columnsSql = dbTables.map(function (_a) {
                            var TABLE_SCHEMA = _a.TABLE_SCHEMA, TABLE_NAME = _a.TABLE_NAME;
                            return "\n                SELECT\n                    *\n                FROM\n                    `INFORMATION_SCHEMA`.`COLUMNS`\n                WHERE\n                    `TABLE_SCHEMA` = '".concat(TABLE_SCHEMA, "'\n                    AND\n                    `TABLE_NAME` = '").concat(TABLE_NAME, "'\n                ");
                        }).join(" UNION ");
                        collationsSql = "\n            SELECT\n                `SCHEMA_NAME`,\n                `DEFAULT_CHARACTER_SET_NAME` as `CHARSET`,\n                `DEFAULT_COLLATION_NAME` AS `COLLATION`\n            FROM `INFORMATION_SCHEMA`.`SCHEMATA`\n            ";
                        primaryKeySql = "SELECT * FROM (".concat(kcuSubquerySql, ") `kcu` WHERE `CONSTRAINT_NAME` = 'PRIMARY'");
                        indicesSql = "\n            SELECT\n                `s`.*\n            FROM (".concat(statsSubquerySql, ") `s`\n            LEFT JOIN (").concat(rcSubquerySql, ") `rc`\n                ON\n                    `s`.`INDEX_NAME` = `rc`.`CONSTRAINT_NAME`\n                    AND\n                    `s`.`TABLE_SCHEMA` = `rc`.`CONSTRAINT_SCHEMA`\n            WHERE\n                `s`.`INDEX_NAME` != 'PRIMARY'\n                AND\n                `rc`.`CONSTRAINT_NAME` IS NULL\n            ");
                        foreignKeysSql = "\n            SELECT\n                `kcu`.`TABLE_SCHEMA`,\n                `kcu`.`TABLE_NAME`,\n                `kcu`.`CONSTRAINT_NAME`,\n                `kcu`.`COLUMN_NAME`,\n                `kcu`.`REFERENCED_TABLE_SCHEMA`,\n                `kcu`.`REFERENCED_TABLE_NAME`,\n                `kcu`.`REFERENCED_COLUMN_NAME`,\n                `rc`.`DELETE_RULE` `ON_DELETE`,\n                `rc`.`UPDATE_RULE` `ON_UPDATE`\n            FROM (".concat(kcuSubquerySql, ") `kcu`\n            INNER JOIN (").concat(rcSubquerySql, ") `rc`\n                ON\n                    `rc`.`CONSTRAINT_SCHEMA` = `kcu`.`CONSTRAINT_SCHEMA`\n                    AND\n                    `rc`.`TABLE_NAME` = `kcu`.`TABLE_NAME`\n                    AND\n                    `rc`.`CONSTRAINT_NAME` = `kcu`.`CONSTRAINT_NAME`\n            ");
                        return [4 /*yield*/, Promise.all([
                                this.query(columnsSql),
                                this.query(primaryKeySql),
                                this.query(collationsSql),
                                this.query(indicesSql),
                                this.query(foreignKeysSql)
                            ])];
                    case 6:
                        _j = __read.apply(void 0, [_k.sent(), 5]), dbColumns = _j[0], dbPrimaryKeys = _j[1], dbCollations = _j[2], dbIndices = _j[3], dbForeignKeys = _j[4];
                        isMariaDb = this.driver.options.type === "mariadb";
                        return [4 /*yield*/, this.getVersion()];
                    case 7:
                        dbVersion = _k.sent();
                        // create tables for loaded tables
                        return [2 /*return*/, Promise.all(dbTables.map(function (dbTable) { return __awaiter(_this, void 0, void 0, function () {
                                var table, dbCollation, defaultCollation, defaultCharset, db, tableForeignKeyConstraints, tableIndexConstraints;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    table = new Table();
                                    dbCollation = dbCollations.find(function (coll) { return coll["SCHEMA_NAME"] === dbTable["TABLE_SCHEMA"]; });
                                    defaultCollation = dbCollation["COLLATION"];
                                    defaultCharset = dbCollation["CHARSET"];
                                    db = dbTable["TABLE_SCHEMA"] === currentDatabase ? undefined : dbTable["TABLE_SCHEMA"];
                                    table.database = dbTable["TABLE_SCHEMA"];
                                    table.name = this.driver.buildTableName(dbTable["TABLE_NAME"], undefined, db);
                                    // create columns from the loaded columns
                                    table.columns = dbColumns
                                        .filter(function (dbColumn) { return dbColumn["TABLE_NAME"] === dbTable["TABLE_NAME"] && dbColumn["TABLE_SCHEMA"] === dbTable["TABLE_SCHEMA"]; })
                                        .map(function (dbColumn) {
                                        var columnUniqueIndices = dbIndices.filter(function (dbIndex) {
                                            return dbIndex["TABLE_NAME"] === dbTable["TABLE_NAME"]
                                                && dbIndex["TABLE_SCHEMA"] === dbTable["TABLE_SCHEMA"]
                                                && dbIndex["COLUMN_NAME"] === dbColumn["COLUMN_NAME"]
                                                && parseInt(dbIndex["NON_UNIQUE"], 10) === 0;
                                        });
                                        var tableMetadata = _this.connection.entityMetadatas.find(function (metadata) { return _this.getTablePath(table) === _this.getTablePath(metadata); });
                                        var hasIgnoredIndex = columnUniqueIndices.length > 0
                                            && tableMetadata
                                            && tableMetadata.indices.some(function (index) {
                                                return columnUniqueIndices.some(function (uniqueIndex) {
                                                    return index.name === uniqueIndex["INDEX_NAME"] && index.synchronize === false;
                                                });
                                            });
                                        var isConstraintComposite = columnUniqueIndices.every(function (uniqueIndex) {
                                            return dbIndices.some(function (dbIndex) { return dbIndex["INDEX_NAME"] === uniqueIndex["INDEX_NAME"] && dbIndex["COLUMN_NAME"] !== dbColumn["COLUMN_NAME"]; });
                                        });
                                        var tableColumn = new TableColumn();
                                        tableColumn.name = dbColumn["COLUMN_NAME"];
                                        tableColumn.type = dbColumn["DATA_TYPE"].toLowerCase();
                                        tableColumn.zerofill = dbColumn["COLUMN_TYPE"].indexOf("zerofill") !== -1;
                                        tableColumn.unsigned = tableColumn.zerofill ? true : dbColumn["COLUMN_TYPE"].indexOf("unsigned") !== -1;
                                        if (_this.driver.withWidthColumnTypes.indexOf(tableColumn.type) !== -1) {
                                            var width = dbColumn["COLUMN_TYPE"].substring(dbColumn["COLUMN_TYPE"].indexOf("(") + 1, dbColumn["COLUMN_TYPE"].indexOf(")"));
                                            tableColumn.width = width && !_this.isDefaultColumnWidth(table, tableColumn, parseInt(width)) ? parseInt(width) : undefined;
                                        }
                                        if (dbColumn["COLUMN_DEFAULT"] === null
                                            || dbColumn["COLUMN_DEFAULT"] === undefined
                                            || (isMariaDb && dbColumn["COLUMN_DEFAULT"] === "NULL")) {
                                            tableColumn.default = undefined;
                                        }
                                        else if (/^CURRENT_TIMESTAMP(\([0-9]*\))?$/i.test(dbColumn["COLUMN_DEFAULT"])) {
                                            // New versions of MariaDB return expressions in lowercase.  We need to set it in
                                            // uppercase so the comparison in MysqlDriver#compareDefaultValues does not fail.
                                            tableColumn.default = dbColumn["COLUMN_DEFAULT"].toUpperCase();
                                        }
                                        else if (isMariaDb && VersionUtils.isGreaterOrEqual(dbVersion, "10.2.7")) {
                                            // MariaDB started adding quotes to literals in COLUMN_DEFAULT since version 10.2.7
                                            // See https://mariadb.com/kb/en/library/information-schema-columns-table/
                                            tableColumn.default = dbColumn["COLUMN_DEFAULT"];
                                        }
                                        else {
                                            tableColumn.default = "'".concat(dbColumn["COLUMN_DEFAULT"], "'");
                                        }
                                        if (dbColumn["EXTRA"].indexOf("on update") !== -1) {
                                            // New versions of MariaDB return expressions in lowercase.  We need to set it in
                                            // uppercase so the comparison in MysqlDriver#compareExtraValues does not fail.
                                            tableColumn.onUpdate = dbColumn["EXTRA"].substring(dbColumn["EXTRA"].indexOf("on update") + 10).toUpperCase();
                                        }
                                        if (dbColumn["GENERATION_EXPRESSION"]) {
                                            tableColumn.asExpression = dbColumn["GENERATION_EXPRESSION"];
                                            tableColumn.generatedType = dbColumn["EXTRA"].indexOf("VIRTUAL") !== -1 ? "VIRTUAL" : "STORED";
                                        }
                                        tableColumn.isUnique = columnUniqueIndices.length > 0 && !hasIgnoredIndex && !isConstraintComposite;
                                        tableColumn.isNullable = dbColumn["IS_NULLABLE"] === "YES";
                                        tableColumn.isPrimary = dbPrimaryKeys.some(function (dbPrimaryKey) {
                                            return (dbPrimaryKey["TABLE_NAME"] === dbColumn["TABLE_NAME"] &&
                                                dbPrimaryKey["TABLE_SCHEMA"] === dbColumn["TABLE_SCHEMA"] &&
                                                dbPrimaryKey["COLUMN_NAME"] === dbColumn["COLUMN_NAME"]);
                                        });
                                        tableColumn.isGenerated = dbColumn["EXTRA"].indexOf("auto_increment") !== -1;
                                        if (tableColumn.isGenerated)
                                            tableColumn.generationStrategy = "increment";
                                        tableColumn.comment = (typeof dbColumn["COLUMN_COMMENT"] === "string" && dbColumn["COLUMN_COMMENT"].length === 0) ? undefined : dbColumn["COLUMN_COMMENT"];
                                        if (dbColumn["CHARACTER_SET_NAME"])
                                            tableColumn.charset = dbColumn["CHARACTER_SET_NAME"] === defaultCharset ? undefined : dbColumn["CHARACTER_SET_NAME"];
                                        if (dbColumn["COLLATION_NAME"])
                                            tableColumn.collation = dbColumn["COLLATION_NAME"] === defaultCollation ? undefined : dbColumn["COLLATION_NAME"];
                                        // check only columns that have length property
                                        if (_this.driver.withLengthColumnTypes.indexOf(tableColumn.type) !== -1 && dbColumn["CHARACTER_MAXIMUM_LENGTH"]) {
                                            var length_1 = dbColumn["CHARACTER_MAXIMUM_LENGTH"].toString();
                                            tableColumn.length = !_this.isDefaultColumnLength(table, tableColumn, length_1) ? length_1 : "";
                                        }
                                        if (tableColumn.type === "decimal" || tableColumn.type === "double" || tableColumn.type === "float") {
                                            if (dbColumn["NUMERIC_PRECISION"] !== null && !_this.isDefaultColumnPrecision(table, tableColumn, dbColumn["NUMERIC_PRECISION"]))
                                                tableColumn.precision = parseInt(dbColumn["NUMERIC_PRECISION"]);
                                            if (dbColumn["NUMERIC_SCALE"] !== null && !_this.isDefaultColumnScale(table, tableColumn, dbColumn["NUMERIC_SCALE"]))
                                                tableColumn.scale = parseInt(dbColumn["NUMERIC_SCALE"]);
                                        }
                                        if (tableColumn.type === "enum" || tableColumn.type === "simple-enum" || tableColumn.type === "set") {
                                            var colType = dbColumn["COLUMN_TYPE"];
                                            var items = colType.substring(colType.indexOf("(") + 1, colType.lastIndexOf(")")).split(",");
                                            tableColumn.enum = items.map(function (item) {
                                                return item.substring(1, item.length - 1);
                                            });
                                            tableColumn.length = "";
                                        }
                                        if ((tableColumn.type === "datetime" || tableColumn.type === "time" || tableColumn.type === "timestamp")
                                            && dbColumn["DATETIME_PRECISION"] !== null && dbColumn["DATETIME_PRECISION"] !== undefined
                                            && !_this.isDefaultColumnPrecision(table, tableColumn, parseInt(dbColumn["DATETIME_PRECISION"]))) {
                                            tableColumn.precision = parseInt(dbColumn["DATETIME_PRECISION"]);
                                        }
                                        return tableColumn;
                                    });
                                    tableForeignKeyConstraints = OrmUtils.uniq(dbForeignKeys.filter(function (dbForeignKey) {
                                        return dbForeignKey["TABLE_NAME"] === dbTable["TABLE_NAME"] && dbForeignKey["TABLE_SCHEMA"] === dbTable["TABLE_SCHEMA"];
                                    }), function (dbForeignKey) { return dbForeignKey["CONSTRAINT_NAME"]; });
                                    table.foreignKeys = tableForeignKeyConstraints.map(function (dbForeignKey) {
                                        var foreignKeys = dbForeignKeys.filter(function (dbFk) { return dbFk["CONSTRAINT_NAME"] === dbForeignKey["CONSTRAINT_NAME"]; });
                                        // if referenced table located in currently used db, we don't need to concat db name to table name.
                                        var database = dbForeignKey["REFERENCED_TABLE_SCHEMA"] === currentDatabase ? undefined : dbForeignKey["REFERENCED_TABLE_SCHEMA"];
                                        var referencedTableName = _this.driver.buildTableName(dbForeignKey["REFERENCED_TABLE_NAME"], undefined, database);
                                        return new TableForeignKey({
                                            name: dbForeignKey["CONSTRAINT_NAME"],
                                            columnNames: foreignKeys.map(function (dbFk) { return dbFk["COLUMN_NAME"]; }),
                                            referencedDatabase: dbForeignKey["REFERENCED_TABLE_SCHEMA"],
                                            referencedTableName: referencedTableName,
                                            referencedColumnNames: foreignKeys.map(function (dbFk) { return dbFk["REFERENCED_COLUMN_NAME"]; }),
                                            onDelete: dbForeignKey["ON_DELETE"],
                                            onUpdate: dbForeignKey["ON_UPDATE"]
                                        });
                                    });
                                    tableIndexConstraints = OrmUtils.uniq(dbIndices.filter(function (dbIndex) { return (dbIndex["TABLE_NAME"] === dbTable["TABLE_NAME"] && dbIndex["TABLE_SCHEMA"] === dbTable["TABLE_SCHEMA"]); }), function (dbIndex) { return dbIndex["INDEX_NAME"]; });
                                    table.indices = tableIndexConstraints.map(function (constraint) {
                                        var indices = dbIndices.filter(function (index) {
                                            return index["TABLE_SCHEMA"] === constraint["TABLE_SCHEMA"]
                                                && index["TABLE_NAME"] === constraint["TABLE_NAME"]
                                                && index["INDEX_NAME"] === constraint["INDEX_NAME"];
                                        });
                                        var nonUnique = parseInt(constraint["NON_UNIQUE"], 10);
                                        return new TableIndex({
                                            table: table,
                                            name: constraint["INDEX_NAME"],
                                            columnNames: indices.map(function (i) { return i["COLUMN_NAME"]; }),
                                            isUnique: nonUnique === 0,
                                            isSpatial: constraint["INDEX_TYPE"] === "SPATIAL",
                                            isFulltext: constraint["INDEX_TYPE"] === "FULLTEXT"
                                        });
                                    });
                                    return [2 /*return*/, table];
                                });
                            }); }))];
                }
            });
        });
    };
    /**
     * Builds create table sql
     */
    MysqlQueryRunner.prototype.createTableSql = function (table, createForeignKeys) {
        var _this = this;
        var columnDefinitions = table.columns.map(function (column) { return _this.buildCreateColumnSql(column, true); }).join(", ");
        var sql = "CREATE TABLE ".concat(this.escapePath(table), " (").concat(columnDefinitions);
        // we create unique indexes instead of unique constraints, because MySql does not have unique constraints.
        // if we mark column as Unique, it means that we create UNIQUE INDEX.
        table.columns
            .filter(function (column) { return column.isUnique; })
            .forEach(function (column) {
            var isUniqueIndexExist = table.indices.some(function (index) {
                return index.columnNames.length === 1 && !!index.isUnique && index.columnNames.indexOf(column.name) !== -1;
            });
            var isUniqueConstraintExist = table.uniques.some(function (unique) {
                return unique.columnNames.length === 1 && unique.columnNames.indexOf(column.name) !== -1;
            });
            if (!isUniqueIndexExist && !isUniqueConstraintExist)
                table.indices.push(new TableIndex({
                    name: _this.connection.namingStrategy.uniqueConstraintName(table, [column.name]),
                    columnNames: [column.name],
                    isUnique: true
                }));
        });
        // as MySql does not have unique constraints, we must create table indices from table uniques and mark them as unique.
        if (table.uniques.length > 0) {
            table.uniques.forEach(function (unique) {
                var uniqueExist = table.indices.some(function (index) { return index.name === unique.name; });
                if (!uniqueExist) {
                    table.indices.push(new TableIndex({
                        name: unique.name,
                        columnNames: unique.columnNames,
                        isUnique: true
                    }));
                }
            });
        }
        if (table.indices.length > 0) {
            var indicesSql = table.indices.map(function (index) {
                var columnNames = index.columnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
                if (!index.name)
                    index.name = _this.connection.namingStrategy.indexName(table, index.columnNames, index.where);
                var indexType = "";
                if (index.isUnique)
                    indexType += "UNIQUE ";
                if (index.isSpatial)
                    indexType += "SPATIAL ";
                if (index.isFulltext)
                    indexType += "FULLTEXT ";
                var indexParser = index.isFulltext && index.parser ? " WITH PARSER ".concat(index.parser) : "";
                return "".concat(indexType, "INDEX `").concat(index.name, "` (").concat(columnNames, ")").concat(indexParser);
            }).join(", ");
            sql += ", ".concat(indicesSql);
        }
        if (table.foreignKeys.length > 0 && createForeignKeys) {
            var foreignKeysSql = table.foreignKeys.map(function (fk) {
                var columnNames = fk.columnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
                if (!fk.name)
                    fk.name = _this.connection.namingStrategy.foreignKeyName(table, fk.columnNames, _this.getTablePath(fk), fk.referencedColumnNames);
                var referencedColumnNames = fk.referencedColumnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
                var constraint = "CONSTRAINT `".concat(fk.name, "` FOREIGN KEY (").concat(columnNames, ") REFERENCES ").concat(_this.escapePath(_this.getTablePath(fk)), " (").concat(referencedColumnNames, ")");
                if (fk.onDelete)
                    constraint += " ON DELETE ".concat(fk.onDelete);
                if (fk.onUpdate)
                    constraint += " ON UPDATE ".concat(fk.onUpdate);
                return constraint;
            }).join(", ");
            sql += ", ".concat(foreignKeysSql);
        }
        if (table.primaryColumns.length > 0) {
            var columnNames = table.primaryColumns.map(function (column) { return "`".concat(column.name, "`"); }).join(", ");
            sql += ", PRIMARY KEY (".concat(columnNames, ")");
        }
        sql += ") ENGINE=".concat(table.engine || "InnoDB");
        return new Query(sql);
    };
    /**
     * Builds drop table sql
     */
    MysqlQueryRunner.prototype.dropTableSql = function (tableOrName) {
        return new Query("DROP TABLE ".concat(this.escapePath(tableOrName)));
    };
    MysqlQueryRunner.prototype.createViewSql = function (view) {
        if (typeof view.expression === "string") {
            return new Query("CREATE VIEW ".concat(this.escapePath(view), " AS ").concat(view.expression));
        }
        else {
            return new Query("CREATE VIEW ".concat(this.escapePath(view), " AS ").concat(view.expression(this.connection).getQuery()));
        }
    };
    MysqlQueryRunner.prototype.insertViewDefinitionSql = function (view) {
        return __awaiter(this, void 0, void 0, function () {
            var currentDatabase, expression;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCurrentDatabase()];
                    case 1:
                        currentDatabase = _a.sent();
                        expression = typeof view.expression === "string" ? view.expression.trim() : view.expression(this.connection).getQuery();
                        return [2 /*return*/, this.insertTypeormMetadataSql({
                                type: MetadataTableType.VIEW,
                                schema: currentDatabase,
                                name: view.name,
                                value: expression
                            })];
                }
            });
        });
    };
    /**
     * Builds drop view sql.
     */
    MysqlQueryRunner.prototype.dropViewSql = function (viewOrPath) {
        return new Query("DROP VIEW ".concat(this.escapePath(viewOrPath)));
    };
    /**
     * Builds remove view sql.
     */
    MysqlQueryRunner.prototype.deleteViewDefinitionSql = function (viewOrPath) {
        return __awaiter(this, void 0, void 0, function () {
            var currentDatabase, viewName;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCurrentDatabase()];
                    case 1:
                        currentDatabase = _a.sent();
                        viewName = viewOrPath instanceof View ? viewOrPath.name : viewOrPath;
                        return [2 /*return*/, this.deleteTypeormMetadataSql({
                                type: MetadataTableType.VIEW,
                                schema: currentDatabase,
                                name: viewName
                            })];
                }
            });
        });
    };
    /**
     * Builds create index sql.
     */
    MysqlQueryRunner.prototype.createIndexSql = function (table, index) {
        var columns = index.columnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
        var indexType = "";
        if (index.isUnique)
            indexType += "UNIQUE ";
        if (index.isSpatial)
            indexType += "SPATIAL ";
        if (index.isFulltext)
            indexType += "FULLTEXT ";
        var indexParser = index.isFulltext && index.parser ? " WITH PARSER ".concat(index.parser) : "";
        return new Query("CREATE ".concat(indexType, "INDEX `").concat(index.name, "` ON ").concat(this.escapePath(table), " (").concat(columns, ")").concat(indexParser));
    };
    /**
     * Builds drop index sql.
     */
    MysqlQueryRunner.prototype.dropIndexSql = function (table, indexOrName) {
        var indexName = indexOrName instanceof TableIndex ? indexOrName.name : indexOrName;
        return new Query("DROP INDEX `".concat(indexName, "` ON ").concat(this.escapePath(table)));
    };
    /**
     * Builds create primary key sql.
     */
    MysqlQueryRunner.prototype.createPrimaryKeySql = function (table, columnNames) {
        var columnNamesString = columnNames.map(function (columnName) { return "`".concat(columnName, "`"); }).join(", ");
        return new Query("ALTER TABLE ".concat(this.escapePath(table), " ADD PRIMARY KEY (").concat(columnNamesString, ")"));
    };
    /**
     * Builds drop primary key sql.
     */
    MysqlQueryRunner.prototype.dropPrimaryKeySql = function (table) {
        return new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP PRIMARY KEY"));
    };
    /**
     * Builds create foreign key sql.
     */
    MysqlQueryRunner.prototype.createForeignKeySql = function (table, foreignKey) {
        var columnNames = foreignKey.columnNames.map(function (column) { return "`".concat(column, "`"); }).join(", ");
        var referencedColumnNames = foreignKey.referencedColumnNames.map(function (column) { return "`".concat(column, "`"); }).join(",");
        var sql = "ALTER TABLE ".concat(this.escapePath(table), " ADD CONSTRAINT `").concat(foreignKey.name, "` FOREIGN KEY (").concat(columnNames, ") ") +
            "REFERENCES ".concat(this.escapePath(this.getTablePath(foreignKey)), "(").concat(referencedColumnNames, ")");
        if (foreignKey.onDelete)
            sql += " ON DELETE ".concat(foreignKey.onDelete);
        if (foreignKey.onUpdate)
            sql += " ON UPDATE ".concat(foreignKey.onUpdate);
        return new Query(sql);
    };
    /**
     * Builds drop foreign key sql.
     */
    MysqlQueryRunner.prototype.dropForeignKeySql = function (table, foreignKeyOrName) {
        var foreignKeyName = foreignKeyOrName instanceof TableForeignKey ? foreignKeyOrName.name : foreignKeyOrName;
        return new Query("ALTER TABLE ".concat(this.escapePath(table), " DROP FOREIGN KEY `").concat(foreignKeyName, "`"));
    };
    /**
     * Escapes a given comment so it's safe to include in a query.
     */
    MysqlQueryRunner.prototype.escapeComment = function (comment) {
        if (!comment || comment.length === 0) {
            return "''";
        }
        comment = comment
            .replace(/\\/g, "\\\\") // MySQL allows escaping characters via backslashes
            .replace(/'/g, "''")
            .replace(/\u0000/g, ""); // Null bytes aren't allowed in comments
        return "'".concat(comment, "'");
    };
    /**
     * Escapes given table or view path.
     */
    MysqlQueryRunner.prototype.escapePath = function (target) {
        var _a = this.driver.parseTableName(target), database = _a.database, tableName = _a.tableName;
        if (database && database !== this.driver.database) {
            return "`".concat(database, "`.`").concat(tableName, "`");
        }
        return "`".concat(tableName, "`");
    };
    /**
     * Builds a part of query to create/change a column.
     */
    MysqlQueryRunner.prototype.buildCreateColumnSql = function (column, skipPrimary, skipName) {
        if (skipName === void 0) { skipName = false; }
        var c = "";
        if (skipName) {
            c = this.connection.driver.createFullType(column);
        }
        else {
            c = "`".concat(column.name, "` ").concat(this.connection.driver.createFullType(column));
        }
        if (column.asExpression)
            c += " AS (".concat(column.asExpression, ") ").concat(column.generatedType ? column.generatedType : "VIRTUAL");
        // if you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to that column.
        if (column.zerofill) {
            c += " ZEROFILL";
        }
        else if (column.unsigned) {
            c += " UNSIGNED";
        }
        if (column.enum)
            c += " (".concat(column.enum.map(function (value) { return "'" + value.replace(/'/g, "''") + "'"; }).join(", "), ")");
        if (column.charset)
            c += " CHARACTER SET \"".concat(column.charset, "\"");
        if (column.collation)
            c += " COLLATE \"".concat(column.collation, "\"");
        var isMariaDb = this.driver.options.type === "mariadb";
        if (isMariaDb && column.asExpression && ["VIRTUAL", "STORED"].includes((column.generatedType || "VIRTUAL"))) {
            // do nothing - MariaDB does not support NULL/NOT NULL expressions for VIRTUAL columns and STORED columns
        }
        else {
            if (!column.isNullable)
                c += " NOT NULL";
            if (column.isNullable)
                c += " NULL";
        }
        if (column.isPrimary && !skipPrimary)
            c += " PRIMARY KEY";
        if (column.isGenerated && column.generationStrategy === "increment") // don't use skipPrimary here since updates can update already exist primary without auto inc.
            c += " AUTO_INCREMENT";
        if (column.comment && column.comment.length > 0)
            c += " COMMENT ".concat(this.escapeComment(column.comment));
        if (column.default !== undefined && column.default !== null)
            c += " DEFAULT ".concat(column.default);
        if (column.onUpdate)
            c += " ON UPDATE ".concat(column.onUpdate);
        return c;
    };
    MysqlQueryRunner.prototype.getVersion = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("SELECT VERSION() AS `version`")];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result[0]["version"]];
                }
            });
        });
    };
    /**
     * Checks if column display width is by default.
     */
    MysqlQueryRunner.prototype.isDefaultColumnWidth = function (table, column, width) {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            var metadata = this.connection.getMetadata(table.name);
            var columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.width)
                return false;
        }
        var defaultWidthForType = this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].width;
        if (defaultWidthForType) {
            // In MariaDB & MySQL 5.7, the default widths of certain numeric types are 1 less than
            // the usual defaults when the column is unsigned.
            var typesWithReducedUnsignedDefault = ["int", "tinyint", "smallint", "mediumint"];
            var needsAdjustment = typesWithReducedUnsignedDefault.indexOf(column.type) !== -1;
            if (column.unsigned && needsAdjustment) {
                return (defaultWidthForType - 1) === width;
            }
            else {
                return defaultWidthForType === width;
            }
        }
        return false;
    };
    return MysqlQueryRunner;
}(BaseQueryRunner));
export { MysqlQueryRunner };

//# sourceMappingURL=MysqlQueryRunner.js.map
