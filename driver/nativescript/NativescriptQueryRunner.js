"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativescriptQueryRunner = void 0;
var tslib_1 = require("tslib");
var QueryRunnerAlreadyReleasedError_1 = require("../../error/QueryRunnerAlreadyReleasedError");
var QueryFailedError_1 = require("../../error/QueryFailedError");
var AbstractSqliteQueryRunner_1 = require("../sqlite-abstract/AbstractSqliteQueryRunner");
var Broadcaster_1 = require("../../subscriber/Broadcaster");
var QueryResult_1 = require("../../query-runner/QueryResult");
/**
 * Runs queries on a single sqlite database connection.
 */
var NativescriptQueryRunner = /** @class */ (function (_super) {
    (0, tslib_1.__extends)(NativescriptQueryRunner, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function NativescriptQueryRunner(driver) {
        var _this = _super.call(this) || this;
        _this.driver = driver;
        _this.connection = driver.connection;
        _this.broadcaster = new Broadcaster_1.Broadcaster(_this);
        return _this;
    }
    /**
     * Called before migrations are run.
     */
    NativescriptQueryRunner.prototype.beforeMigration = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("PRAGMA foreign_keys = OFF")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Called after migrations are run.
     */
    NativescriptQueryRunner.prototype.afterMigration = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.query("PRAGMA foreign_keys = ON")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes a given SQL query.
     */
    NativescriptQueryRunner.prototype.query = function (query, parameters, useStructuredResult) {
        if (useStructuredResult === void 0) { useStructuredResult = false; }
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var connection;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                if (this.isReleased) {
                    throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
                }
                connection = this.driver.connection;
                return [2 /*return*/, new Promise(function (ok, fail) { return (0, tslib_1.__awaiter)(_this, void 0, void 0, function () {
                        var databaseConnection, isInsertQuery, handler, queryStartTime;
                        var _this = this;
                        return (0, tslib_1.__generator)(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, this.connect()];
                                case 1:
                                    databaseConnection = _a.sent();
                                    isInsertQuery = query.substr(0, 11) === "INSERT INTO";
                                    connection.logger.logQuery(query, parameters, this);
                                    handler = function (err, raw) {
                                        // log slow queries if maxQueryExecution time is set
                                        var maxQueryExecutionTime = _this.driver.options.maxQueryExecutionTime;
                                        var queryEndTime = +new Date();
                                        var queryExecutionTime = queryEndTime - queryStartTime;
                                        if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime) {
                                            connection.logger.logQuerySlow(queryExecutionTime, query, parameters, _this);
                                        }
                                        if (err) {
                                            connection.logger.logQueryError(err, query, parameters, _this);
                                            fail(new QueryFailedError_1.QueryFailedError(query, parameters, err));
                                        }
                                        var result = new QueryResult_1.QueryResult();
                                        result.raw = raw;
                                        if (!isInsertQuery && Array.isArray(raw)) {
                                            result.records = raw;
                                        }
                                        if (useStructuredResult) {
                                            ok(result);
                                        }
                                        else {
                                            ok(result.raw);
                                        }
                                    };
                                    queryStartTime = +new Date();
                                    if (isInsertQuery) {
                                        databaseConnection.execSQL(query, parameters, handler);
                                    }
                                    else {
                                        databaseConnection.all(query, parameters, handler);
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Parametrizes given object of values. Used to create column=value queries.
     */
    NativescriptQueryRunner.prototype.parametrize = function (objectLiteral, startIndex) {
        if (startIndex === void 0) { startIndex = 0; }
        return Object.keys(objectLiteral).map(function (key, index) { return "\"".concat(key, "\"") + "=?"; });
    };
    return NativescriptQueryRunner;
}(AbstractSqliteQueryRunner_1.AbstractSqliteQueryRunner));
exports.NativescriptQueryRunner = NativescriptQueryRunner;

//# sourceMappingURL=NativescriptQueryRunner.js.map
