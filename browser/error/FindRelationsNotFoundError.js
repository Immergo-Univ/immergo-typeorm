import { __extends } from "tslib";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when relations specified in the find options were not found in the entities.
*/
var FindRelationsNotFoundError = /** @class */ (function (_super) {
    __extends(FindRelationsNotFoundError, _super);
    function FindRelationsNotFoundError(notFoundRelations) {
        var _this = _super.call(this) || this;
        if (notFoundRelations.length === 1) {
            _this.message = "Relation \"".concat(notFoundRelations[0], "\" was not found; please check if it is correct and really exists in your entity.");
        }
        else {
            _this.message = "Relations ".concat(notFoundRelations.map(function (relation) { return "\"".concat(relation, "\""); }).join(", "), " were not found; please check if relations are correct and they exist in your entities.");
        }
        return _this;
    }
    return FindRelationsNotFoundError;
}(TypeORMError));
export { FindRelationsNotFoundError };

//# sourceMappingURL=FindRelationsNotFoundError.js.map
