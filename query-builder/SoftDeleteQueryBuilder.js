"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftDeleteQueryBuilder = void 0;
var tslib_1 = require("tslib");
var QueryBuilder_1 = require("./QueryBuilder");
var SqlServerDriver_1 = require("../driver/sqlserver/SqlServerDriver");
var UpdateResult_1 = require("./result/UpdateResult");
var ReturningStatementNotSupportedError_1 = require("../error/ReturningStatementNotSupportedError");
var ReturningResultsEntityUpdator_1 = require("./ReturningResultsEntityUpdator");
var MysqlDriver_1 = require("../driver/mysql/MysqlDriver");
var LimitOnUpdateNotSupportedError_1 = require("../error/LimitOnUpdateNotSupportedError");
var MissingDeleteDateColumnError_1 = require("../error/MissingDeleteDateColumnError");
var UpdateValuesMissingError_1 = require("../error/UpdateValuesMissingError");
var EntitySchema_1 = require("../entity-schema/EntitySchema");
var error_1 = require("../error");
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
var SoftDeleteQueryBuilder = /** @class */ (function (_super) {
    (0, tslib_1.__extends)(SoftDeleteQueryBuilder, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function SoftDeleteQueryBuilder(connectionOrQueryBuilder, queryRunner) {
        var _this = _super.call(this, connectionOrQueryBuilder, queryRunner) || this;
        _this.expressionMap.aliasNamePrefixingEnabled = false;
        return _this;
    }
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Gets generated SQL query without parameters being replaced.
     */
    SoftDeleteQueryBuilder.prototype.getQuery = function () {
        var sql = this.createUpdateExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitExpression();
        return sql.trim();
    };
    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    SoftDeleteQueryBuilder.prototype.execute = function () {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var queryRunner, transactionStartedByUs, returningResultsEntityUpdator, _a, sql, parameters, queryResult, updateResult, error_2, rollbackError_1;
            return (0, tslib_1.__generator)(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        queryRunner = this.obtainQueryRunner();
                        transactionStartedByUs = false;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 17, 22, 25]);
                        if (!(this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false)) return [3 /*break*/, 3];
                        return [4 /*yield*/, queryRunner.startTransaction()];
                    case 2:
                        _b.sent();
                        transactionStartedByUs = true;
                        _b.label = 3;
                    case 3:
                        if (!(this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata)) return [3 /*break*/, 7];
                        if (!(this.expressionMap.queryType === "soft-delete")) return [3 /*break*/, 5];
                        return [4 /*yield*/, queryRunner.broadcaster.broadcast("BeforeSoftRemove", this.expressionMap.mainAlias.metadata)];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        if (!(this.expressionMap.queryType === "restore")) return [3 /*break*/, 7];
                        return [4 /*yield*/, queryRunner.broadcaster.broadcast("BeforeRecover", this.expressionMap.mainAlias.metadata)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        returningResultsEntityUpdator = new ReturningResultsEntityUpdator_1.ReturningResultsEntityUpdator(queryRunner, this.expressionMap);
                        if (this.expressionMap.updateEntity === true &&
                            this.expressionMap.mainAlias.hasMetadata &&
                            this.expressionMap.whereEntities.length > 0) {
                            this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getSoftDeletionReturningColumns();
                        }
                        _a = (0, tslib_1.__read)(this.getQueryAndParameters(), 2), sql = _a[0], parameters = _a[1];
                        return [4 /*yield*/, queryRunner.query(sql, parameters, true)];
                    case 8:
                        queryResult = _b.sent();
                        updateResult = UpdateResult_1.UpdateResult.from(queryResult);
                        if (!(this.expressionMap.updateEntity === true &&
                            this.expressionMap.mainAlias.hasMetadata &&
                            this.expressionMap.whereEntities.length > 0)) return [3 /*break*/, 10];
                        return [4 /*yield*/, returningResultsEntityUpdator.update(updateResult, this.expressionMap.whereEntities)];
                    case 9:
                        _b.sent();
                        _b.label = 10;
                    case 10:
                        if (!(this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata)) return [3 /*break*/, 14];
                        if (!(this.expressionMap.queryType === "soft-delete")) return [3 /*break*/, 12];
                        return [4 /*yield*/, queryRunner.broadcaster.broadcast("AfterSoftRemove", this.expressionMap.mainAlias.metadata)];
                    case 11:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 12:
                        if (!(this.expressionMap.queryType === "restore")) return [3 /*break*/, 14];
                        return [4 /*yield*/, queryRunner.broadcaster.broadcast("AfterRecover", this.expressionMap.mainAlias.metadata)];
                    case 13:
                        _b.sent();
                        _b.label = 14;
                    case 14:
                        if (!transactionStartedByUs) return [3 /*break*/, 16];
                        return [4 /*yield*/, queryRunner.commitTransaction()];
                    case 15:
                        _b.sent();
                        _b.label = 16;
                    case 16: return [2 /*return*/, updateResult];
                    case 17:
                        error_2 = _b.sent();
                        if (!transactionStartedByUs) return [3 /*break*/, 21];
                        _b.label = 18;
                    case 18:
                        _b.trys.push([18, 20, , 21]);
                        return [4 /*yield*/, queryRunner.rollbackTransaction()];
                    case 19:
                        _b.sent();
                        return [3 /*break*/, 21];
                    case 20:
                        rollbackError_1 = _b.sent();
                        return [3 /*break*/, 21];
                    case 21: throw error_2;
                    case 22:
                        if (!(queryRunner !== this.queryRunner)) return [3 /*break*/, 24];
                        return [4 /*yield*/, queryRunner.release()];
                    case 23:
                        _b.sent();
                        _b.label = 24;
                    case 24: return [7 /*endfinally*/];
                    case 25: return [2 /*return*/];
                }
            });
        });
    };
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Specifies FROM which entity's table select/update/delete/soft-delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    SoftDeleteQueryBuilder.prototype.from = function (entityTarget, aliasName) {
        entityTarget = entityTarget instanceof EntitySchema_1.EntitySchema ? entityTarget.options.name : entityTarget;
        var mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return this;
    };
    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    SoftDeleteQueryBuilder.prototype.where = function (where, parameters) {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        var condition = this.getWhereCondition(where);
        if (condition)
            this.expressionMap.wheres = [{ type: "simple", condition: condition }];
        if (parameters)
            this.setParameters(parameters);
        return this;
    };
    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    SoftDeleteQueryBuilder.prototype.andWhere = function (where, parameters) {
        this.expressionMap.wheres.push({ type: "and", condition: this.getWhereCondition(where) });
        if (parameters)
            this.setParameters(parameters);
        return this;
    };
    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    SoftDeleteQueryBuilder.prototype.orWhere = function (where, parameters) {
        this.expressionMap.wheres.push({ type: "or", condition: this.getWhereCondition(where) });
        if (parameters)
            this.setParameters(parameters);
        return this;
    };
    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    SoftDeleteQueryBuilder.prototype.whereInIds = function (ids) {
        return this.where(this.getWhereInIdsCondition(ids));
    };
    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    SoftDeleteQueryBuilder.prototype.andWhereInIds = function (ids) {
        return this.andWhere(this.getWhereInIdsCondition(ids));
    };
    /**
     * Adds new OR WHERE with conditions for the given ids.
     */
    SoftDeleteQueryBuilder.prototype.orWhereInIds = function (ids) {
        return this.orWhere(this.getWhereInIdsCondition(ids));
    };
    /**
     * Optional returning/output clause.
     */
    SoftDeleteQueryBuilder.prototype.output = function (output) {
        return this.returning(output);
    };
    /**
     * Optional returning/output clause.
     */
    SoftDeleteQueryBuilder.prototype.returning = function (returning) {
        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported("update")) {
            throw new ReturningStatementNotSupportedError_1.ReturningStatementNotSupportedError();
        }
        this.expressionMap.returning = returning;
        return this;
    };
    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    SoftDeleteQueryBuilder.prototype.orderBy = function (sort, order, nulls) {
        var _a, _b;
        if (order === void 0) { order = "ASC"; }
        if (sort) {
            if (sort instanceof Object) {
                this.expressionMap.orderBys = sort;
            }
            else {
                if (nulls) {
                    this.expressionMap.orderBys = (_a = {}, _a[sort] = { order: order, nulls: nulls }, _a);
                }
                else {
                    this.expressionMap.orderBys = (_b = {}, _b[sort] = order, _b);
                }
            }
        }
        else {
            this.expressionMap.orderBys = {};
        }
        return this;
    };
    /**
     * Adds ORDER BY condition in the query builder.
     */
    SoftDeleteQueryBuilder.prototype.addOrderBy = function (sort, order, nulls) {
        if (order === void 0) { order = "ASC"; }
        if (nulls) {
            this.expressionMap.orderBys[sort] = { order: order, nulls: nulls };
        }
        else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    };
    /**
     * Sets LIMIT - maximum number of rows to be selected.
     */
    SoftDeleteQueryBuilder.prototype.limit = function (limit) {
        this.expressionMap.limit = limit;
        return this;
    };
    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    SoftDeleteQueryBuilder.prototype.whereEntity = function (entity) {
        var _this = this;
        if (!this.expressionMap.mainAlias.hasMetadata)
            throw new error_1.TypeORMError(".whereEntity method can only be used on queries which update real entity table.");
        this.expressionMap.wheres = [];
        var entities = Array.isArray(entity) ? entity : [entity];
        entities.forEach(function (entity) {
            var entityIdMap = _this.expressionMap.mainAlias.metadata.getEntityIdMap(entity);
            if (!entityIdMap)
                throw new error_1.TypeORMError("Provided entity does not have ids set, cannot perform operation.");
            _this.orWhereInIds(entityIdMap);
        });
        this.expressionMap.whereEntities = entities;
        return this;
    };
    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    SoftDeleteQueryBuilder.prototype.updateEntity = function (enabled) {
        this.expressionMap.updateEntity = enabled;
        return this;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates UPDATE express used to perform insert query.
     */
    SoftDeleteQueryBuilder.prototype.createUpdateExpression = function () {
        var metadata = this.expressionMap.mainAlias.hasMetadata ? this.expressionMap.mainAlias.metadata : undefined;
        if (!metadata)
            throw new error_1.TypeORMError("Cannot get entity metadata for the given alias \"".concat(this.expressionMap.mainAlias, "\""));
        if (!metadata.deleteDateColumn) {
            throw new MissingDeleteDateColumnError_1.MissingDeleteDateColumnError(metadata);
        }
        // prepare columns and values to be updated
        var updateColumnAndValues = [];
        switch (this.expressionMap.queryType) {
            case "soft-delete":
                updateColumnAndValues.push(this.escape(metadata.deleteDateColumn.databaseName) + " = CURRENT_TIMESTAMP");
                break;
            case "restore":
                updateColumnAndValues.push(this.escape(metadata.deleteDateColumn.databaseName) + " = NULL");
                break;
            default:
                throw new error_1.TypeORMError("The queryType must be \"soft-delete\" or \"restore\"");
        }
        if (metadata.versionColumn)
            updateColumnAndValues.push(this.escape(metadata.versionColumn.databaseName) + " = " + this.escape(metadata.versionColumn.databaseName) + " + 1");
        if (metadata.updateDateColumn)
            updateColumnAndValues.push(this.escape(metadata.updateDateColumn.databaseName) + " = CURRENT_TIMESTAMP"); // todo: fix issue with CURRENT_TIMESTAMP(6) being used, can "DEFAULT" be used?!
        if (updateColumnAndValues.length <= 0) {
            throw new UpdateValuesMissingError_1.UpdateValuesMissingError();
        }
        // get a table name and all column database names
        var whereExpression = this.createWhereExpression();
        var returningExpression = this.createReturningExpression("update");
        if (returningExpression === "") {
            return "UPDATE ".concat(this.getTableName(this.getMainTableName()), " SET ").concat(updateColumnAndValues.join(", ")).concat(whereExpression); // todo: how do we replace aliases in where to nothing?
        }
        if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver) {
            return "UPDATE ".concat(this.getTableName(this.getMainTableName()), " SET ").concat(updateColumnAndValues.join(", "), " OUTPUT ").concat(returningExpression).concat(whereExpression);
        }
        return "UPDATE ".concat(this.getTableName(this.getMainTableName()), " SET ").concat(updateColumnAndValues.join(", ")).concat(whereExpression, " RETURNING ").concat(returningExpression);
    };
    /**
     * Creates "ORDER BY" part of SQL query.
     */
    SoftDeleteQueryBuilder.prototype.createOrderByExpression = function () {
        var _this = this;
        var orderBys = this.expressionMap.orderBys;
        if (Object.keys(orderBys).length > 0)
            return " ORDER BY " + Object.keys(orderBys)
                .map(function (columnName) {
                if (typeof orderBys[columnName] === "string") {
                    return _this.replacePropertyNames(columnName) + " " + orderBys[columnName];
                }
                else {
                    return _this.replacePropertyNames(columnName) + " " + orderBys[columnName].order + " " + orderBys[columnName].nulls;
                }
            })
                .join(", ");
        return "";
    };
    /**
     * Creates "LIMIT" parts of SQL query.
     */
    SoftDeleteQueryBuilder.prototype.createLimitExpression = function () {
        var limit = this.expressionMap.limit;
        if (limit) {
            if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver) {
                return " LIMIT " + limit;
            }
            else {
                throw new LimitOnUpdateNotSupportedError_1.LimitOnUpdateNotSupportedError();
            }
        }
        return "";
    };
    return SoftDeleteQueryBuilder;
}(QueryBuilder_1.QueryBuilder));
exports.SoftDeleteQueryBuilder = SoftDeleteQueryBuilder;

//# sourceMappingURL=SoftDeleteQueryBuilder.js.map
