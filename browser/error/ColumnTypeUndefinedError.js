import { __extends } from "tslib";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when ORM cannot get column's type automatically.
 * Basically, when reflect-metadata is not available or tsconfig is not properly setup.
 */
var ColumnTypeUndefinedError = /** @class */ (function (_super) {
    __extends(ColumnTypeUndefinedError, _super);
    function ColumnTypeUndefinedError(object, propertyName) {
        return _super.call(this, "Column type for ".concat(object.constructor.name, "#").concat(propertyName, " is not defined and cannot be guessed. ") +
            "Make sure you have turned on an \"emitDecoratorMetadata\": true option in tsconfig.json. " +
            "Also make sure you have imported \"reflect-metadata\" on top of the main entry file in your application (before any entity imported)." +
            "If you are using JavaScript instead of TypeScript you must explicitly provide a column type.") || this;
    }
    return ColumnTypeUndefinedError;
}(TypeORMError));
export { ColumnTypeUndefinedError };

//# sourceMappingURL=ColumnTypeUndefinedError.js.map
