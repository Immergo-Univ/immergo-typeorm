"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosureSubjectExecutor = void 0;
var tslib_1 = require("tslib");
var CannotAttachTreeChildrenEntityError_1 = require("../../error/CannotAttachTreeChildrenEntityError");
var OrmUtils_1 = require("../../util/OrmUtils");
var SqlServerDriver_1 = require("../../driver/sqlserver/SqlServerDriver");
/**
 * Executes subject operations for closure entities.
 */
var ClosureSubjectExecutor = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function ClosureSubjectExecutor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Executes operations when subject is being inserted.
     */
    ClosureSubjectExecutor.prototype.insert = function (subject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var closureJunctionInsertMap, parent, escape_1, tableName, queryParams_1, ancestorColumnNames, descendantColumnNames, childEntityIds1, whereCondition;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        closureJunctionInsertMap = {};
                        subject.metadata.closureJunctionTable.ancestorColumns.forEach(function (column) {
                            closureJunctionInsertMap[column.databaseName] = subject.identifier;
                        });
                        subject.metadata.closureJunctionTable.descendantColumns.forEach(function (column) {
                            closureJunctionInsertMap[column.databaseName] = subject.identifier;
                        });
                        // insert values into the closure junction table
                        return [4 /*yield*/, this.queryRunner
                                .manager
                                .createQueryBuilder()
                                .insert()
                                .into(subject.metadata.closureJunctionTable.tablePath)
                                .values(closureJunctionInsertMap)
                                .updateEntity(false)
                                .callListeners(false)
                                .execute()];
                    case 1:
                        // insert values into the closure junction table
                        _a.sent();
                        parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity);
                        if (!parent && subject.parentSubject && subject.parentSubject.entity) // if entity was attached via children
                            parent = subject.parentSubject.insertedValueSet ? subject.parentSubject.insertedValueSet : subject.parentSubject.entity;
                        if (!parent) return [3 /*break*/, 3];
                        escape_1 = function (alias) { return _this.queryRunner.connection.driver.escape(alias); };
                        tableName = this.getTableName(subject.metadata.closureJunctionTable.tablePath);
                        queryParams_1 = [];
                        ancestorColumnNames = subject.metadata.closureJunctionTable.ancestorColumns.map(function (column) {
                            return escape_1(column.databaseName);
                        });
                        descendantColumnNames = subject.metadata.closureJunctionTable.descendantColumns.map(function (column) {
                            return escape_1(column.databaseName);
                        });
                        childEntityIds1 = subject.metadata.primaryColumns.map(function (column) {
                            queryParams_1.push(column.getEntityValue(subject.insertedValueSet ? subject.insertedValueSet : subject.entity));
                            return _this.queryRunner.connection.driver.createParameter("child_entity_" + column.databaseName, queryParams_1.length - 1);
                        });
                        whereCondition = subject.metadata.closureJunctionTable.descendantColumns.map(function (column) {
                            var columnName = escape_1(column.databaseName);
                            var parentId = column.referencedColumn.getEntityValue(parent);
                            if (!parentId)
                                throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                            queryParams_1.push(parentId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("parent_entity_" + column.referencedColumn.databaseName, queryParams_1.length - 1);
                            return "".concat(columnName, " = ").concat(parameterName);
                        });
                        return [4 /*yield*/, this.queryRunner.query("INSERT INTO ".concat(tableName, " (").concat((0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(ancestorColumnNames), false), (0, tslib_1.__read)(descendantColumnNames), false).join(", "), ") ") +
                                "SELECT ".concat(ancestorColumnNames.join(", "), ", ").concat(childEntityIds1.join(", "), " FROM ").concat(tableName, " WHERE ").concat(whereCondition.join(" AND ")), queryParams_1)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes operations when subject is being updated.
     */
    ClosureSubjectExecutor.prototype.update = function (subject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var parent, entity, oldParent, oldParentId, parentId, escape, closureTable, ancestorColumnNames, descendantColumnNames, createSubQuery, parameters, _a, _b, column, queryParams_2, tableName, superAlias_1, subAlias_1, select, entityWhereCondition, parentWhereCondition;
            var e_1, _c;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity);
                        if (!parent && subject.parentSubject && subject.parentSubject.entity) // if entity was attached via children
                            parent = subject.parentSubject.entity;
                        entity = subject.databaseEntity;
                        if (!entity && parent) // if entity was attached via children
                            entity = subject.metadata.treeChildrenRelation.getEntityValue(parent).find(function (child) {
                                return Object.entries(subject.identifier).every(function (_a) {
                                    var _b = (0, tslib_1.__read)(_a, 2), key = _b[0], value = _b[1];
                                    return child[key] === value;
                                });
                            });
                        // Exit if the parent or the entity where never set
                        if (entity === undefined || parent === undefined) {
                            return [2 /*return*/];
                        }
                        oldParent = subject.metadata.treeParentRelation.getEntityValue(entity);
                        oldParentId = subject.metadata.getEntityIdMap(oldParent);
                        parentId = subject.metadata.getEntityIdMap(parent);
                        // Exit if the new and old parents are the same
                        if (OrmUtils_1.OrmUtils.compareIds(oldParentId, parentId)) {
                            return [2 /*return*/];
                        }
                        escape = function (alias) { return _this.queryRunner.connection.driver.escape(alias); };
                        closureTable = subject.metadata.closureJunctionTable;
                        ancestorColumnNames = closureTable.ancestorColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        descendantColumnNames = closureTable.descendantColumns.map(function (column) {
                            return escape(column.databaseName);
                        });
                        createSubQuery = function (qb, alias) {
                            var e_2, _a;
                            var subAlias = "sub".concat(alias);
                            var subSelect = qb.createQueryBuilder()
                                .select(descendantColumnNames.join(", "))
                                .from(closureTable.tablePath, subAlias);
                            try {
                                // Create where conditions e.g. (WHERE "subdescendant"."id_ancestor" = :value_id)
                                for (var _b = (0, tslib_1.__values)(closureTable.ancestorColumns), _c = _b.next(); !_c.done; _c = _b.next()) {
                                    var column = _c.value;
                                    subSelect.andWhere("".concat(escape(subAlias), ".").concat(escape(column.databaseName), " = :value_").concat(column.referencedColumn.databaseName));
                                }
                            }
                            catch (e_2_1) { e_2 = { error: e_2_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                                }
                                finally { if (e_2) throw e_2.error; }
                            }
                            return qb.createQueryBuilder()
                                .select(descendantColumnNames.join(", "))
                                .from("(".concat(subSelect.getQuery(), ")"), alias)
                                .setParameters(subSelect.getParameters())
                                .getQuery();
                        };
                        parameters = {};
                        try {
                            for (_a = (0, tslib_1.__values)(subject.metadata.primaryColumns), _b = _a.next(); !_b.done; _b = _a.next()) {
                                column = _b.value;
                                parameters["value_".concat(column.databaseName)] = entity[column.databaseName];
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        return [4 /*yield*/, this.queryRunner
                                .manager
                                .createQueryBuilder()
                                .delete()
                                .from(closureTable.tablePath)
                                .where(function (qb) { return "(".concat(descendantColumnNames.join(", "), ") IN (").concat(createSubQuery(qb, "descendant"), ")"); })
                                .andWhere(function (qb) { return "(".concat(ancestorColumnNames.join(", "), ") NOT IN (").concat(createSubQuery(qb, "ancestor"), ")"); })
                                .setParameters(parameters)
                                .execute()];
                    case 1:
                        _d.sent();
                        if (!parent) return [3 /*break*/, 3];
                        queryParams_2 = [];
                        tableName = this.getTableName(closureTable.tablePath);
                        superAlias_1 = escape("supertree");
                        subAlias_1 = escape("subtree");
                        select = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(ancestorColumnNames.map(function (columnName) { return "".concat(superAlias_1, ".").concat(columnName); })), false), (0, tslib_1.__read)(descendantColumnNames.map(function (columnName) { return "".concat(subAlias_1, ".").concat(columnName); })), false);
                        entityWhereCondition = subject.metadata.closureJunctionTable.ancestorColumns.map(function (column) {
                            var columnName = escape(column.databaseName);
                            var entityId = column.referencedColumn.getEntityValue(entity);
                            queryParams_2.push(entityId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("entity_" + column.referencedColumn.databaseName, queryParams_2.length - 1);
                            return "".concat(subAlias_1, ".").concat(columnName, " = ").concat(parameterName);
                        });
                        parentWhereCondition = subject.metadata.closureJunctionTable.descendantColumns.map(function (column) {
                            var columnName = escape(column.databaseName);
                            var parentId = column.referencedColumn.getEntityValue(parent);
                            if (!parentId)
                                throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                            queryParams_2.push(parentId);
                            var parameterName = _this.queryRunner.connection.driver.createParameter("parent_entity_" + column.referencedColumn.databaseName, queryParams_2.length - 1);
                            return "".concat(superAlias_1, ".").concat(columnName, " = ").concat(parameterName);
                        });
                        return [4 /*yield*/, this.queryRunner.query("INSERT INTO ".concat(tableName, " (").concat((0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(ancestorColumnNames), false), (0, tslib_1.__read)(descendantColumnNames), false).join(", "), ") ") +
                                "SELECT ".concat(select.join(", "), " ") +
                                "FROM ".concat(tableName, " AS ").concat(superAlias_1, ", ").concat(tableName, " AS ").concat(subAlias_1, " ") +
                                "WHERE ".concat((0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(entityWhereCondition), false), (0, tslib_1.__read)(parentWhereCondition), false).join(" AND ")), queryParams_2)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
    * Executes operations when subject is being removed.
    */
    ClosureSubjectExecutor.prototype.remove = function (subjects) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var escape, identifiers, closureTable, generateWheres, ancestorWhere, descendantWhere;
            var _this = this;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Only mssql need to execute deletes for the juntion table as it doesn't support multi cascade paths.
                        if (!(this.queryRunner.connection.driver instanceof SqlServerDriver_1.SqlServerDriver)) {
                            return [2 /*return*/];
                        }
                        if (!Array.isArray(subjects))
                            subjects = [subjects];
                        escape = function (alias) { return _this.queryRunner.connection.driver.escape(alias); };
                        identifiers = subjects.map(function (subject) { return subject.identifier; });
                        closureTable = subjects[0].metadata.closureJunctionTable;
                        generateWheres = function (columns) {
                            return columns.map(function (column) {
                                var data = identifiers.map(function (identifier) { return identifier[column.referencedColumn.databaseName]; });
                                return "".concat(escape(column.databaseName), " IN (").concat(data.join(", "), ")");
                            }).join(" AND ");
                        };
                        ancestorWhere = generateWheres(closureTable.ancestorColumns);
                        descendantWhere = generateWheres(closureTable.descendantColumns);
                        return [4 /*yield*/, this.queryRunner
                                .manager
                                .createQueryBuilder()
                                .delete()
                                .from(closureTable.tablePath)
                                .where(ancestorWhere)
                                .orWhere(descendantWhere)
                                .execute()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gets escaped table name with schema name if SqlServer or Postgres driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    ClosureSubjectExecutor.prototype.getTableName = function (tablePath) {
        var _this = this;
        return tablePath.split(".")
            .map(function (i) {
            // this condition need because in SQL Server driver when custom database name was specified and schema name was not, we got `dbName..tableName` string, and doesn't need to escape middle empty string
            return i === "" ? i : _this.queryRunner.connection.driver.escape(i);
        }).join(".");
    };
    return ClosureSubjectExecutor;
}());
exports.ClosureSubjectExecutor = ClosureSubjectExecutor;

//# sourceMappingURL=ClosureSubjectExecutor.js.map
