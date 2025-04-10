import { __read } from "tslib";
import { QueryBuilderUtils } from "../QueryBuilderUtils";
import { ObjectUtils } from "../../util/ObjectUtils";
import { TypeORMError } from "../../error/TypeORMError";
/**
 * Stores all join relation id attributes which will be used to build a JOIN query.
 */
var RelationIdAttribute = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function RelationIdAttribute(queryExpressionMap, relationIdAttribute) {
        this.queryExpressionMap = queryExpressionMap;
        /**
         * Indicates if relation id should NOT be loaded as id map.
         */
        this.disableMixedMap = false;
        ObjectUtils.assign(this, relationIdAttribute || {});
    }
    Object.defineProperty(RelationIdAttribute.prototype, "joinInverseSideMetadata", {
        // -------------------------------------------------------------------------
        // Public Methods
        // -------------------------------------------------------------------------
        get: function () {
            return this.relation.inverseEntityMetadata;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "parentAlias", {
        /**
         * Alias of the parent of this join.
         * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
         * This value is extracted from entityOrProperty value.
         * This is available when join was made using "post.category" syntax.
         */
        get: function () {
            if (!QueryBuilderUtils.isAliasProperty(this.relationName))
                throw new TypeORMError("Given value must be a string representation of alias property");
            return this.relationName.substr(0, this.relationName.indexOf("."));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "relationPropertyPath", {
        /**
         * Relation property name of the parent.
         * This is used to understand what is joined.
         * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
         * This value is extracted from entityOrProperty value.
         * This is available when join was made using "post.category" syntax.
         */
        get: function () {
            if (!QueryBuilderUtils.isAliasProperty(this.relationName))
                throw new TypeORMError("Given value must be a string representation of alias property");
            return this.relationName.substr(this.relationName.indexOf(".") + 1);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "relation", {
        /**
         * Relation of the parent.
         * This is used to understand what is joined.
         * This is available when join was made using "post.category" syntax.
         */
        get: function () {
            if (!QueryBuilderUtils.isAliasProperty(this.relationName))
                throw new TypeORMError("Given value must be a string representation of alias property");
            var relationOwnerSelection = this.queryExpressionMap.findAliasByName(this.parentAlias);
            var relation = relationOwnerSelection.metadata.findRelationWithPropertyPath(this.relationPropertyPath);
            if (!relation)
                throw new TypeORMError("Relation with property path ".concat(this.relationPropertyPath, " in entity was not found."));
            return relation;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "junctionAlias", {
        /**
         * Generates alias of junction table, whose ids we get.
         */
        get: function () {
            var _a = __read(this.relationName.split("."), 2), parentAlias = _a[0], relationProperty = _a[1];
            return parentAlias + "_" + relationProperty + "_rid";
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "junctionMetadata", {
        /**
         * Metadata of the joined entity.
         * If extra condition without entity was joined, then it will return undefined.
         */
        get: function () {
            return this.relation.junctionEntityMetadata;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "mapToPropertyParentAlias", {
        get: function () {
            return this.mapToProperty.substr(0, this.mapToProperty.indexOf("."));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RelationIdAttribute.prototype, "mapToPropertyPropertyPath", {
        get: function () {
            return this.mapToProperty.substr(this.mapToProperty.indexOf(".") + 1);
        },
        enumerable: false,
        configurable: true
    });
    return RelationIdAttribute;
}());
export { RelationIdAttribute };

//# sourceMappingURL=RelationIdAttribute.js.map
