import { __assign, __awaiter, __generator, __read, __spreadArray } from "tslib";
import { EntityNotFoundError } from "../error/EntityNotFoundError";
import { QueryRunnerProviderAlreadyReleasedError } from "../error/QueryRunnerProviderAlreadyReleasedError";
import { NoNeedToReleaseEntityManagerError } from "../error/NoNeedToReleaseEntityManagerError";
import { TreeRepository } from "../repository/TreeRepository";
import { Repository } from "../repository/Repository";
import { FindOptionsUtils } from "../find-options/FindOptionsUtils";
import { PlainObjectToNewEntityTransformer } from "../query-builder/transformer/PlainObjectToNewEntityTransformer";
import { PlainObjectToDatabaseEntityTransformer } from "../query-builder/transformer/PlainObjectToDatabaseEntityTransformer";
import { CustomRepositoryNotFoundError } from "../error/CustomRepositoryNotFoundError";
import { AbstractRepository } from "../repository/AbstractRepository";
import { CustomRepositoryCannotInheritRepositoryError } from "../error/CustomRepositoryCannotInheritRepositoryError";
import { RepositoryNotFoundError } from "../error/RepositoryNotFoundError";
import { RepositoryNotTreeError } from "../error/RepositoryNotTreeError";
import { RepositoryFactory } from "../repository/RepositoryFactory";
import { TreeRepositoryNotSupportedError } from "../error/TreeRepositoryNotSupportedError";
import { EntityPersistExecutor } from "../persistence/EntityPersistExecutor";
import { ObjectUtils } from "../util/ObjectUtils";
import { EntitySchema } from "../entity-schema/EntitySchema";
import { getMetadataArgsStorage } from "../globals";
import { TypeORMError } from "../error";
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
var EntityManager = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function EntityManager(connection, queryRunner) {
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        /**
         * Once created and then reused by en repositories.
         */
        this.repositories = [];
        /**
         * Plain to object transformer used in create and merge operations.
         */
        this.plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer();
        this.connection = connection;
        if (queryRunner) {
            this.queryRunner = queryRunner;
            // dynamic: this.queryRunner = manager;
            ObjectUtils.assign(this.queryRunner, { manager: this });
        }
    }
    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    EntityManager.prototype.transaction = function (isolationOrRunInTransaction, runInTransactionParam) {
        return __awaiter(this, void 0, void 0, function () {
            var isolation, runInTransaction, queryRunner, result, err_1, rollbackError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isolation = typeof isolationOrRunInTransaction === "string" ? isolationOrRunInTransaction : undefined;
                        runInTransaction = typeof isolationOrRunInTransaction === "function" ? isolationOrRunInTransaction : runInTransactionParam;
                        if (!runInTransaction) {
                            throw new TypeORMError("Transaction method requires callback in second paramter if isolation level is supplied.");
                        }
                        if (this.queryRunner && this.queryRunner.isReleased)
                            throw new QueryRunnerProviderAlreadyReleasedError();
                        queryRunner = this.queryRunner || this.connection.createQueryRunner();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 10, 13]);
                        return [4 /*yield*/, queryRunner.startTransaction(isolation)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, runInTransaction(queryRunner.manager)];
                    case 3:
                        result = _a.sent();
                        return [4 /*yield*/, queryRunner.commitTransaction()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, result];
                    case 5:
                        err_1 = _a.sent();
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, queryRunner.rollbackTransaction()];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        rollbackError_1 = _a.sent();
                        return [3 /*break*/, 9];
                    case 9: throw err_1;
                    case 10:
                        if (!!this.queryRunner) return [3 /*break*/, 12];
                        return [4 /*yield*/, queryRunner.release()];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: return [7 /*endfinally*/];
                    case 13: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Executes raw SQL query and returns raw database results.
     */
    EntityManager.prototype.query = function (query, parameters) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.connection.query(query, parameters, this.queryRunner)];
            });
        });
    };
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    EntityManager.prototype.createQueryBuilder = function (entityClass, alias, queryRunner) {
        if (alias) {
            return this.connection.createQueryBuilder(entityClass, alias, queryRunner || this.queryRunner);
        }
        else {
            return this.connection.createQueryBuilder(entityClass || queryRunner || this.queryRunner);
        }
    };
    /**
     * Checks if entity has an id by its Function type or schema name.
     */
    EntityManager.prototype.hasId = function (targetOrEntity, maybeEntity) {
        var target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        var entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        var metadata = this.connection.getMetadata(target);
        return metadata.hasId(entity);
    };
    /**
     * Gets entity mixed id.
     */
    EntityManager.prototype.getId = function (targetOrEntity, maybeEntity) {
        var target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
        var entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
        var metadata = this.connection.getMetadata(target);
        return metadata.getEntityIdMixedMap(entity);
    };
    /**
     * Creates a new entity instance or instances.
     * Can copy properties from the given object into new entities.
     */
    EntityManager.prototype.create = function (entityClass, plainObjectOrObjects) {
        var _this = this;
        var metadata = this.connection.getMetadata(entityClass);
        if (!plainObjectOrObjects)
            return metadata.create(this.queryRunner);
        if (Array.isArray(plainObjectOrObjects))
            return plainObjectOrObjects.map(function (plainEntityLike) { return _this.create(entityClass, plainEntityLike); });
        var mergeIntoEntity = metadata.create(this.queryRunner);
        this.plainObjectToEntityTransformer.transform(mergeIntoEntity, plainObjectOrObjects, metadata, true);
        return mergeIntoEntity;
    };
    /**
     * Merges two entities into one new entity.
     */
    EntityManager.prototype.merge = function (entityClass, mergeIntoEntity) {
        var _this = this;
        var entityLikes = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            entityLikes[_i - 2] = arguments[_i];
        }
        var metadata = this.connection.getMetadata(entityClass);
        entityLikes.forEach(function (object) { return _this.plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata); });
        return mergeIntoEntity;
    };
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    EntityManager.prototype.preload = function (entityClass, entityLike) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, plainObjectToDatabaseEntityTransformer, transformedEntity;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = this.connection.getMetadata(entityClass);
                        plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer(this.connection.manager);
                        return [4 /*yield*/, plainObjectToDatabaseEntityTransformer.transform(entityLike, metadata)];
                    case 1:
                        transformedEntity = _a.sent();
                        if (transformedEntity)
                            return [2 /*return*/, this.merge(entityClass, transformedEntity, entityLike)];
                        return [2 /*return*/, undefined];
                }
            });
        });
    };
    /**
     * Saves a given entity in the database.
     */
    EntityManager.prototype.save = function (targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        var target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        var entity = target ? maybeEntityOrOptions : targetOrEntity;
        var options = target ? maybeOptions : maybeEntityOrOptions;
        if (target instanceof EntitySchema)
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "save", target, entity, options)
            .execute()
            .then(function () { return entity; });
    };
    /**
     * Removes a given entity from the database.
     */
    EntityManager.prototype.remove = function (targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        var target = (arguments.length > 1 && (targetOrEntity instanceof Function || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        var entity = target ? maybeEntityOrOptions : targetOrEntity;
        var options = target ? maybeOptions : maybeEntityOrOptions;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute save operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "remove", target, entity, options)
            .execute()
            .then(function () { return entity; });
    };
    /**
     * Records the delete date of one or many given entities.
     */
    EntityManager.prototype.softRemove = function (targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        var target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        var entity = target ? maybeEntityOrOptions : targetOrEntity;
        var options = target ? maybeOptions : maybeEntityOrOptions;
        if (target instanceof EntitySchema)
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute soft-remove operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "soft-remove", target, entity, options)
            .execute()
            .then(function () { return entity; });
    };
    /**
     * Recovers one or many given entities.
     */
    EntityManager.prototype.recover = function (targetOrEntity, maybeEntityOrOptions, maybeOptions) {
        // normalize mixed parameters
        var target = (arguments.length > 1 && (targetOrEntity instanceof Function || targetOrEntity instanceof EntitySchema || typeof targetOrEntity === "string")) ? targetOrEntity : undefined;
        var entity = target ? maybeEntityOrOptions : targetOrEntity;
        var options = target ? maybeOptions : maybeEntityOrOptions;
        if (target instanceof EntitySchema)
            target = target.options.name;
        // if user passed empty array of entities then we don't need to do anything
        if (Array.isArray(entity) && entity.length === 0)
            return Promise.resolve(entity);
        // execute recover operation
        return new EntityPersistExecutor(this.connection, this.queryRunner, "recover", target, entity, options)
            .execute()
            .then(function () { return entity; });
    };
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    EntityManager.prototype.insert = function (target, entity) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.createQueryBuilder()
                        .insert()
                        .into(target)
                        .values(entity)
                        .execute()];
            });
        });
    };
    EntityManager.prototype.upsert = function (target, entityOrEntities, conflictPathsOrOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, options, entities, conflictColumns, overwriteColumns;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(target);
                if (Array.isArray(conflictPathsOrOptions)) {
                    options = {
                        conflictPaths: conflictPathsOrOptions
                    };
                }
                else {
                    options = conflictPathsOrOptions;
                }
                if (!Array.isArray(entityOrEntities)) {
                    entities = [entityOrEntities];
                }
                else {
                    entities = entityOrEntities;
                }
                conflictColumns = metadata.mapPropertyPathsToColumns(options.conflictPaths);
                overwriteColumns = metadata.columns
                    .filter(function (col) { return (!conflictColumns.includes(col)) && entities.some(function (entity) { return typeof col.getEntityValue(entity) !== "undefined"; }); });
                return [2 /*return*/, this.createQueryBuilder()
                        .insert()
                        .into(target)
                        .values(entities)
                        .orUpdate(__spreadArray(__spreadArray([], __read(conflictColumns), false), __read(overwriteColumns), false).map(function (col) { return col.databaseName; }), conflictColumns.map(function (col) { return col.databaseName; }), {
                        skipUpdateIfNoValuesChanged: options.skipUpdateIfNoValuesChanged
                    })
                        .execute()];
            });
        });
    };
    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    EntityManager.prototype.update = function (target, criteria, partialEntity) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new TypeORMError("Empty criteria(s) are not allowed for the update method."));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .update(target)
                .set(partialEntity)
                .where(criteria)
                .execute();
        }
    };
    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    EntityManager.prototype.delete = function (targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new TypeORMError("Empty criteria(s) are not allowed for the delete method."));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .delete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    };
    /**
     * Records the delete date of entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    EntityManager.prototype.softDelete = function (targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new TypeORMError("Empty criteria(s) are not allowed for the delete method."));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .softDelete()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    };
    /**
     * Restores entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    EntityManager.prototype.restore = function (targetOrEntity, criteria) {
        // if user passed empty criteria or empty list of criterias, then throw an error
        if (criteria === undefined ||
            criteria === null ||
            criteria === "" ||
            (Array.isArray(criteria) && criteria.length === 0)) {
            return Promise.reject(new TypeORMError("Empty criteria(s) are not allowed for the delete method."));
        }
        if (typeof criteria === "string" ||
            typeof criteria === "number" ||
            criteria instanceof Date ||
            Array.isArray(criteria)) {
            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .whereInIds(criteria)
                .execute();
        }
        else {
            return this.createQueryBuilder()
                .restore()
                .from(targetOrEntity)
                .where(criteria)
                .execute();
        }
    };
    /**
     * Counts entities that match given find options or conditions.
     * Useful for pagination.
     */
    EntityManager.prototype.count = function (entityClass, optionsOrConditions) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, qb;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(entityClass);
                qb = this.createQueryBuilder(entityClass, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
                return [2 /*return*/, FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions).getCount()];
            });
        });
    };
    /**
     * Finds entities that match given find options or conditions.
     */
    EntityManager.prototype.find = function (entityClass, optionsOrConditions) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, qb;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(entityClass);
                qb = this.createQueryBuilder(entityClass, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
                FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
                if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
                    FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
                return [2 /*return*/, qb.getMany()];
            });
        });
    };
    /**
     * Finds entities that match given find options and conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    EntityManager.prototype.findAndCount = function (entityClass, optionsOrConditions) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, qb;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(entityClass);
                qb = this.createQueryBuilder(entityClass, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
                FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
                if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
                    FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
                return [2 /*return*/, qb.getManyAndCount()];
            });
        });
    };
    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     */
    EntityManager.prototype.findByIds = function (entityClass, ids, optionsOrConditions) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, qb;
            return __generator(this, function (_a) {
                // if no ids passed, no need to execute a query - just return an empty array of values
                if (!ids.length)
                    return [2 /*return*/, Promise.resolve([])];
                metadata = this.connection.getMetadata(entityClass);
                qb = this.createQueryBuilder(entityClass, FindOptionsUtils.extractFindManyOptionsAlias(optionsOrConditions) || metadata.name);
                FindOptionsUtils.applyFindManyOptionsOrConditionsToQueryBuilder(qb, optionsOrConditions);
                if (!FindOptionsUtils.isFindManyOptions(optionsOrConditions) || optionsOrConditions.loadEagerRelations !== false)
                    FindOptionsUtils.joinEagerRelations(qb, qb.alias, metadata);
                return [2 /*return*/, qb.andWhereInIds(ids).getMany()];
            });
        });
    };
    /**
     * Finds first entity that matches given conditions.
     */
    EntityManager.prototype.findOne = function (entityClass, idOrOptionsOrConditions, maybeOptions) {
        return __awaiter(this, void 0, void 0, function () {
            var findOptions, options, metadata, alias, qb, passedId;
            return __generator(this, function (_a) {
                findOptions = undefined;
                if (FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions)) {
                    findOptions = idOrOptionsOrConditions;
                }
                else if (maybeOptions && FindOptionsUtils.isFindOneOptions(maybeOptions)) {
                    findOptions = maybeOptions;
                }
                options = undefined;
                if (idOrOptionsOrConditions instanceof Object && !FindOptionsUtils.isFindOneOptions(idOrOptionsOrConditions))
                    options = idOrOptionsOrConditions;
                metadata = this.connection.getMetadata(entityClass);
                alias = metadata.name;
                if (findOptions && findOptions.join) {
                    alias = findOptions.join.alias;
                }
                else if (maybeOptions && FindOptionsUtils.isFindOneOptions(maybeOptions) && maybeOptions.join) {
                    alias = maybeOptions.join.alias;
                }
                qb = this.createQueryBuilder(entityClass, alias);
                passedId = typeof idOrOptionsOrConditions === "string" || typeof idOrOptionsOrConditions === "number" || idOrOptionsOrConditions instanceof Date;
                if (!passedId) {
                    findOptions = __assign(__assign({}, (findOptions || {})), { take: 1 });
                }
                FindOptionsUtils.applyOptionsToQueryBuilder(qb, findOptions);
                if (!findOptions || findOptions.loadEagerRelations !== false) {
                    FindOptionsUtils.joinEagerRelations(qb, qb.alias, qb.expressionMap.mainAlias.metadata);
                }
                if (options) {
                    qb.where(options);
                }
                else if (passedId) {
                    qb.andWhereInIds(metadata.ensureEntityIdMap(idOrOptionsOrConditions));
                }
                return [2 /*return*/, qb.getOne()];
            });
        });
    };
    /**
     * Finds first entity that matches given conditions or rejects the returned promise on error.
     */
    EntityManager.prototype.findOneOrFail = function (entityClass, idOrOptionsOrConditions, maybeOptions) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.findOne(entityClass, idOrOptionsOrConditions, maybeOptions).then(function (value) {
                        if (value === undefined) {
                            return Promise.reject(new EntityNotFoundError(entityClass, idOrOptionsOrConditions));
                        }
                        return Promise.resolve(value);
                    })];
            });
        });
    };
    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    EntityManager.prototype.clear = function (entityClass) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, queryRunner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        metadata = this.connection.getMetadata(entityClass);
                        queryRunner = this.queryRunner || this.connection.createQueryRunner();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 6]);
                        return [4 /*yield*/, queryRunner.clearTable(metadata.tablePath)];
                    case 2: return [2 /*return*/, _a.sent()]; // await is needed here because we are using finally
                    case 3:
                        if (!!this.queryRunner) return [3 /*break*/, 5];
                        return [4 /*yield*/, queryRunner.release()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    EntityManager.prototype.increment = function (entityClass, conditions, propertyPath, value) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, column, values;
            var _this = this;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(entityClass);
                column = metadata.findColumnWithPropertyPath(propertyPath);
                if (!column)
                    throw new TypeORMError("Column ".concat(propertyPath, " was not found in ").concat(metadata.targetName, " entity."));
                if (isNaN(Number(value)))
                    throw new TypeORMError("Value \"".concat(value, "\" is not a number."));
                values = propertyPath
                    .split(".")
                    .reduceRight(function (value, key) {
                    var _a;
                    return (_a = {}, _a[key] = value, _a);
                }, function () { return _this.connection.driver.escape(column.databaseName) + " + " + value; });
                return [2 /*return*/, this
                        .createQueryBuilder(entityClass, "entity")
                        .update(entityClass)
                        .set(values)
                        .where(conditions)
                        .execute()];
            });
        });
    };
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    EntityManager.prototype.decrement = function (entityClass, conditions, propertyPath, value) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata, column, values;
            var _this = this;
            return __generator(this, function (_a) {
                metadata = this.connection.getMetadata(entityClass);
                column = metadata.findColumnWithPropertyPath(propertyPath);
                if (!column)
                    throw new TypeORMError("Column ".concat(propertyPath, " was not found in ").concat(metadata.targetName, " entity."));
                if (isNaN(Number(value)))
                    throw new TypeORMError("Value \"".concat(value, "\" is not a number."));
                values = propertyPath
                    .split(".")
                    .reduceRight(function (value, key) {
                    var _a;
                    return (_a = {}, _a[key] = value, _a);
                }, function () { return _this.connection.driver.escape(column.databaseName) + " - " + value; });
                return [2 /*return*/, this
                        .createQueryBuilder(entityClass, "entity")
                        .update(entityClass)
                        .set(values)
                        .where(conditions)
                        .execute()];
            });
        });
    };
    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    EntityManager.prototype.getRepository = function (target) {
        // throw exception if there is no repository with this target registered
        if (!this.connection.hasMetadata(target))
            throw new RepositoryNotFoundError(this.connection.name, target);
        // find already created repository instance and return it if found
        var metadata = this.connection.getMetadata(target);
        var repository = this.repositories.find(function (repository) { return repository.metadata === metadata; });
        if (repository)
            return repository;
        // if repository was not found then create it, store its instance and return it
        var newRepository = new RepositoryFactory().create(this, metadata, this.queryRunner);
        this.repositories.push(newRepository);
        return newRepository;
    };
    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    EntityManager.prototype.getTreeRepository = function (target) {
        // tree tables aren't supported by some drivers (mongodb)
        if (this.connection.driver.treeSupport === false)
            throw new TreeRepositoryNotSupportedError(this.connection.driver);
        // check if repository is real tree repository
        var repository = this.getRepository(target);
        if (!(repository instanceof TreeRepository))
            throw new RepositoryNotTreeError(target);
        return repository;
    };
    /**
     * Gets mongodb repository for the given entity class.
     */
    EntityManager.prototype.getMongoRepository = function (target) {
        return this.connection.getMongoRepository(target);
    };
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     */
    EntityManager.prototype.getCustomRepository = function (customRepository) {
        var entityRepositoryMetadataArgs = getMetadataArgsStorage().entityRepositories.find(function (repository) {
            return repository.target === (customRepository instanceof Function ? customRepository : customRepository.constructor);
        });
        if (!entityRepositoryMetadataArgs)
            throw new CustomRepositoryNotFoundError(customRepository);
        var entityMetadata = entityRepositoryMetadataArgs.entity ? this.connection.getMetadata(entityRepositoryMetadataArgs.entity) : undefined;
        var entityRepositoryInstance = new entityRepositoryMetadataArgs.target(this, entityMetadata);
        // NOTE: dynamic access to protected properties. We need this to prevent unwanted properties in those classes to be exposed,
        // however we need these properties for internal work of the class
        if (entityRepositoryInstance instanceof AbstractRepository) {
            if (!entityRepositoryInstance["manager"])
                entityRepositoryInstance["manager"] = this;
        }
        if (entityRepositoryInstance instanceof Repository) {
            if (!entityMetadata)
                throw new CustomRepositoryCannotInheritRepositoryError(customRepository);
            entityRepositoryInstance["manager"] = this;
            entityRepositoryInstance["metadata"] = entityMetadata;
        }
        return entityRepositoryInstance;
    };
    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    EntityManager.prototype.release = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.queryRunner)
                    throw new NoNeedToReleaseEntityManagerError();
                return [2 /*return*/, this.queryRunner.release()];
            });
        });
    };
    return EntityManager;
}());
export { EntityManager };

//# sourceMappingURL=EntityManager.js.map
