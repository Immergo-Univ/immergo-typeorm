"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationCountMetadata = void 0;
var error_1 = require("../error");
/**
 * Contains all information about entity's relation count.
 */
var RelationCountMetadata = /** @class */ (function () {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    function RelationCountMetadata(options) {
        this.entityMetadata = options.entityMetadata;
        this.target = options.args.target;
        this.propertyName = options.args.propertyName;
        this.relationNameOrFactory = options.args.relation;
        this.alias = options.args.alias;
        this.queryBuilderFactory = options.args.queryBuilderFactory;
    }
    // ---------------------------------------------------------------------
    // Public Builder Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend relation count metadata properties.
     * This builder method should be used only after entity metadata, its properties map and all relations are build.
     */
    RelationCountMetadata.prototype.build = function () {
        var propertyPath = this.relationNameOrFactory instanceof Function ? this.relationNameOrFactory(this.entityMetadata.propertiesMap) : this.relationNameOrFactory;
        var relation = this.entityMetadata.findRelationWithPropertyPath(propertyPath);
        if (!relation)
            throw new error_1.TypeORMError("Cannot find relation ".concat(propertyPath, ". Wrong relation specified for @RelationCount decorator."));
        this.relation = relation;
    };
    return RelationCountMetadata;
}());
exports.RelationCountMetadata = RelationCountMetadata;

//# sourceMappingURL=RelationCountMetadata.js.map
