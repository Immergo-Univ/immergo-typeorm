"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandUtils = void 0;
var tslib_1 = require("tslib");
var fs = (0, tslib_1.__importStar)(require("fs"));
var path = (0, tslib_1.__importStar)(require("path"));
var mkdirp_1 = (0, tslib_1.__importDefault)(require("mkdirp"));
var error_1 = require("../error");
/**
 * Command line utils functions.
 */
var CommandUtils = /** @class */ (function () {
    function CommandUtils() {
    }
    /**
     * Creates directories recursively.
     */
    CommandUtils.createDirectories = function (directory) {
        return (0, mkdirp_1.default)(directory);
    };
    /**
     * Creates a file with the given content in the given path.
     */
    CommandUtils.createFile = function (filePath, content, override) {
        if (override === void 0) { override = true; }
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, CommandUtils.createDirectories(path.dirname(filePath))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, new Promise(function (ok, fail) {
                                if (override === false && fs.existsSync(filePath))
                                    return ok();
                                fs.writeFile(filePath, content, function (err) { return err ? fail(err) : ok(); });
                            })];
                }
            });
        });
    };
    /**
     * Reads everything from a given file and returns its content as a string.
     */
    CommandUtils.readFile = function (filePath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/, new Promise(function (ok, fail) {
                        fs.readFile(filePath, function (err, data) { return err ? fail(err) : ok(data.toString()); });
                    })];
            });
        });
    };
    CommandUtils.fileExists = function (filePath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            return (0, tslib_1.__generator)(this, function (_a) {
                return [2 /*return*/, fs.existsSync(filePath)];
            });
        });
    };
    /**
     * Gets migration timestamp and validates argument (if sent)
     */
    CommandUtils.getTimestamp = function (timestampOptionArgument) {
        if (timestampOptionArgument && (isNaN(timestampOptionArgument) || timestampOptionArgument < 0)) {
            throw new error_1.TypeORMError("timestamp option should be a non-negative number. received: ".concat(timestampOptionArgument));
        }
        return timestampOptionArgument ? new Date(Number(timestampOptionArgument)).getTime() : Date.now();
    };
    return CommandUtils;
}());
exports.CommandUtils = CommandUtils;

//# sourceMappingURL=CommandUtils.js.map
