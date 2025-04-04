"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturningResultsEntityUpdator = void 0;
var tslib_1 = require("tslib");
var OracleDriver_1 = require("../driver/oracle/OracleDriver");
var error_1 = require("../error");
/**
 * Updates entity with returning results in the entity insert and update operations.
 */
var ReturningResultsEntityUpdator = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function ReturningResultsEntityUpdator(queryRunner, expressionMap) {
        this.queryRunner = queryRunner;
        this.expressionMap = expressionMap;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Updates entities with a special columns after updation query execution.
     */
    ReturningResultsEntityUpdator.prototype.update = function (updateResult, entities) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var metadata;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = this.expressionMap.mainAlias.metadata;
                        return [4 /*yield*/, Promise.all(entities.map(function (entity, entityIndex) { return (0, tslib_1.__awaiter)(_this, void 0, void 0, function () {
                                var result, returningColumns, updationColumns, entityId, loadedReturningColumns;
                                var _this = this;
                                return (0, tslib_1.__generator)(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!this.queryRunner.connection.driver.isReturningSqlSupported("update")) return [3 /*break*/, 1];
                                            if (this.queryRunner.connection.driver instanceof OracleDriver_1.OracleDriver && Array.isArray(updateResult.raw) && this.expressionMap.extraReturningColumns.length > 0) {
                                                updateResult.raw = updateResult.raw.reduce(function (newRaw, rawItem, rawItemIndex) {
                                                    newRaw[_this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                                                    return newRaw;
                                                }, {});
                                            }
                                            result = Array.isArray(updateResult.raw) ? updateResult.raw[entityIndex] : updateResult.raw;
                                            returningColumns = this.queryRunner.connection.driver.createGeneratedMap(metadata, result);
                                            if (returningColumns) {
                                                this.queryRunner.manager.merge(metadata.target, entity, returningColumns);
                                                updateResult.generatedMaps.push(returningColumns);
                                            }
                                            return [3 /*break*/, 3];
                                        case 1:
                                            updationColumns = this.expressionMap.extraReturningColumns;
                                            if (!(updationColumns.length > 0)) return [3 /*break*/, 3];
                                            entityId = this.expressionMap.mainAlias.metadata.getEntityIdMap(entity);
                                            if (!entityId)
                                                throw new error_1.TypeORMError("Cannot update entity because entity id is not set in the entity.");
                                            return [4 /*yield*/, this.queryRunner.manager
                                                    .createQueryBuilder()
                                                    .select(metadata.primaryColumns.map(function (column) { return metadata.targetName + "." + column.propertyPath; }))
                                                    .addSelect(updationColumns.map(function (column) { return metadata.targetName + "." + column.propertyPath; }))
                                                    .from(metadata.target, metadata.targetName)
                                                    .where(entityId)
                                                    .withDeleted()
                                                    .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                                                    .getOne()];
                                        case 2:
                                            loadedReturningColumns = _a.sent();
                                            if (loadedReturningColumns) {
                                                this.queryRunner.manager.merge(metadata.target, entity, loadedReturningColumns);
                                                updateResult.generatedMaps.push(loadedReturningColumns);
                                            }
                                            _a.label = 3;
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Updates entities with a special columns after insertion query execution.
     */
    ReturningResultsEntityUpdator.prototype.insert = function (insertResult, entities) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var metadata, insertionColumns, generatedMaps, entityIds, returningResult_1;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = this.expressionMap.mainAlias.metadata;
                        insertionColumns = this.getInsertionReturningColumns();
                        generatedMaps = entities.map(function (entity, entityIndex) {
                            if (_this.queryRunner.connection.driver instanceof OracleDriver_1.OracleDriver && Array.isArray(insertResult.raw) && _this.expressionMap.extraReturningColumns.length > 0) {
                                insertResult.raw = insertResult.raw.reduce(function (newRaw, rawItem, rawItemIndex) {
                                    newRaw[_this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                                    return newRaw;
                                }, {});
                            }
                            // get all values generated by a database for us
                            var result = Array.isArray(insertResult.raw) ? insertResult.raw[entityIndex] : insertResult.raw;
                            var generatedMap = _this.queryRunner.connection.driver.createGeneratedMap(metadata, result, entityIndex, entities.length) || {};
                            if (entityIndex in _this.expressionMap.locallyGenerated) {
                                _this.queryRunner.manager.merge(metadata.target, generatedMap, _this.expressionMap.locallyGenerated[entityIndex]);
                            }
                            _this.queryRunner.manager.merge(metadata.target, entity, generatedMap);
                            return generatedMap;
                        });
                        if (!(insertionColumns.length > 0 &&
                            !this.queryRunner.connection.driver.isReturningSqlSupported("insert"))) return [3 /*break*/, 2];
                        entityIds = entities.map(function (entity) {
                            var entityId = metadata.getEntityIdMap(entity);
                            // We have to check for an empty `entityId` - if we don't, the query against the database
                            // effectively drops the `where` clause entirely and the first record will be returned -
                            // not what we want at all.
                            if (!entityId)
                                throw new error_1.TypeORMError("Cannot update entity because entity id is not set in the entity.");
                            return entityId;
                        });
                        return [4 /*yield*/, this.queryRunner.manager
                                .createQueryBuilder()
                                .select(metadata.primaryColumns.map(function (column) { return metadata.targetName + "." + column.propertyPath; }))
                                .addSelect(insertionColumns.map(function (column) { return metadata.targetName + "." + column.propertyPath; }))
                                .from(metadata.target, metadata.targetName)
                                .where(entityIds)
                                .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                                .getMany()];
                    case 1:
                        returningResult_1 = _a.sent();
                        entities.forEach(function (entity, entityIndex) {
                            _this.queryRunner.manager.merge(metadata.target, generatedMaps[entityIndex], returningResult_1[entityIndex]);
                            _this.queryRunner.manager.merge(metadata.target, entity, returningResult_1[entityIndex]);
                        });
                        _a.label = 2;
                    case 2:
                        entities.forEach(function (entity, entityIndex) {
                            var entityId = metadata.getEntityIdMap(entity);
                            insertResult.identifiers.push(entityId);
                            insertResult.generatedMaps.push(generatedMaps[entityIndex]);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Columns we need to be returned from the database when we insert entity.
     */
    ReturningResultsEntityUpdator.prototype.getInsertionReturningColumns = function () {
        // for databases which support returning statement we need to return extra columns like id
        // for other databases we don't need to return id column since its returned by a driver already
        var needToCheckGenerated = this.queryRunner.connection.driver.isReturningSqlSupported("insert");
        // filter out the columns of which we need database inserted values to update our entity
        return this.expressionMap.mainAlias.metadata.columns.filter(function (column) {
            return column.default !== undefined ||
                (needToCheckGenerated && column.isGenerated) ||
                column.isCreateDate ||
                column.isUpdateDate ||
                column.isDeleteDate ||
                column.isVersion;
        });
    };
    /**
     * Columns we need to be returned from the database when we update entity.
     */
    ReturningResultsEntityUpdator.prototype.getUpdationReturningColumns = function () {
        return this.expressionMap.mainAlias.metadata.columns.filter(function (column) {
            return column.isUpdateDate || column.isVersion;
        });
    };
    /**
     * Columns we need to be returned from the database when we soft delete and restore entity.
     */
    ReturningResultsEntityUpdator.prototype.getSoftDeletionReturningColumns = function () {
        return this.expressionMap.mainAlias.metadata.columns.filter(function (column) {
            return column.isUpdateDate || column.isVersion || column.isDeleteDate;
        });
    };
    return ReturningResultsEntityUpdator;
}());
exports.ReturningResultsEntityUpdator = ReturningResultsEntityUpdator;

//# sourceMappingURL=ReturningResultsEntityUpdator.js.map
