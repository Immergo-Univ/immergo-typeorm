"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriberCreateCommand = void 0;
var tslib_1 = require("tslib");
var ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
var CommandUtils_1 = require("./CommandUtils");
var chalk_1 = (0, tslib_1.__importDefault)(require("chalk"));
var PlatformTools_1 = require("../platform/PlatformTools");
/**
 * Generates a new subscriber.
 */
var SubscriberCreateCommand = /** @class */ (function () {
    function SubscriberCreateCommand() {
        this.command = "subscriber:create";
        this.describe = "Generates a new subscriber.";
    }
    SubscriberCreateCommand.prototype.builder = function (args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which to run a query"
        })
            .option("n", {
            alias: "name",
            describe: "Name of the subscriber class.",
            demand: true
        })
            .option("d", {
            alias: "dir",
            describe: "Directory where subscriber should be created."
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        });
    };
    SubscriberCreateCommand.prototype.handler = function (args) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var fileContent, filename, directory, connectionOptionsReader, connectionOptions, err_1, path, err_2;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        fileContent = SubscriberCreateCommand.getTemplate(args.name);
                        filename = args.name + ".ts";
                        directory = args.dir;
                        if (!!directory) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                            root: process.cwd(),
                            configName: args.config
                        });
                        return [4 /*yield*/, connectionOptionsReader.get(args.connection)];
                    case 2:
                        connectionOptions = _a.sent();
                        directory = connectionOptions.cli ? (connectionOptions.cli.subscribersDir || "") : "";
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        if (directory && !directory.startsWith("/")) {
                            directory = process.cwd() + "/" + directory;
                        }
                        path = (directory ? (directory + "/") : "") + filename;
                        return [4 /*yield*/, CommandUtils_1.CommandUtils.createFile(path, fileContent)];
                    case 5:
                        _a.sent();
                        console.log(chalk_1.default.green("Subscriber ".concat(chalk_1.default.blue(path), " has been created successfully.")));
                        return [3 /*break*/, 7];
                    case 6:
                        err_2 = _a.sent();
                        PlatformTools_1.PlatformTools.logCmdErr("Error during subscriber creation:");
                        process.exit(1);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------
    /**
     * Gets contents of the entity file.
     */
    SubscriberCreateCommand.getTemplate = function (name) {
        return "import {EventSubscriber, EntitySubscriberInterface} from \"typeorm\";\nimport { PlatformTools } from '../platform/PlatformTools';\n\n@EventSubscriber()\nexport class ".concat(name, " implements EntitySubscriberInterface<any> {\n\n}\n");
    };
    return SubscriberCreateCommand;
}());
exports.SubscriberCreateCommand = SubscriberCreateCommand;

//# sourceMappingURL=SubscriberCreateCommand.js.map
