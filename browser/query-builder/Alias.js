import { ObjectUtils } from "../util/ObjectUtils";
import { TypeORMError } from "../error";
/**
 */
var Alias = /** @class */ (function () {
    function Alias(alias) {
        ObjectUtils.assign(this, alias || {});
    }
    Object.defineProperty(Alias.prototype, "target", {
        get: function () {
            return this.metadata.target;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Alias.prototype, "hasMetadata", {
        get: function () {
            return !!this._metadata;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Alias.prototype, "metadata", {
        get: function () {
            if (!this._metadata)
                throw new TypeORMError("Cannot get entity metadata for the given alias \"".concat(this.name, "\""));
            return this._metadata;
        },
        set: function (metadata) {
            this._metadata = metadata;
        },
        enumerable: false,
        configurable: true
    });
    return Alias;
}());
export { Alias };

//# sourceMappingURL=Alias.js.map
