import { __extends } from "tslib";
import { TypeORMError } from "./TypeORMError";
var MissingJoinColumnError = /** @class */ (function (_super) {
    __extends(MissingJoinColumnError, _super);
    function MissingJoinColumnError(entityMetadata, relation) {
        var _this = _super.call(this) || this;
        if (relation.inverseRelation) {
            _this.message = "JoinColumn is missing on both sides of ".concat(entityMetadata.name, "#").concat(relation.propertyName, " and ") +
                "".concat(relation.inverseEntityMetadata.name, "#").concat(relation.inverseRelation.propertyName, " one-to-one relationship. ") +
                "You need to put JoinColumn decorator on one of the sides.";
        }
        else {
            _this.message = "JoinColumn is missing on ".concat(entityMetadata.name, "#").concat(relation.propertyName, " one-to-one relationship. ") +
                "You need to put JoinColumn decorator on it.";
        }
        return _this;
    }
    return MissingJoinColumnError;
}(TypeORMError));
export { MissingJoinColumnError };

//# sourceMappingURL=MissingJoinColumnError.js.map
