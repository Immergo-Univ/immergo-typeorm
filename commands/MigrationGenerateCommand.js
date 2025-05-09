"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationGenerateCommand = void 0;
var tslib_1 = require("tslib");
var ConnectionOptionsReader_1 = require("../connection/ConnectionOptionsReader");
var CommandUtils_1 = require("./CommandUtils");
var globals_1 = require("../globals");
var StringUtils_1 = require("../util/StringUtils");
var chalk_1 = (0, tslib_1.__importDefault)(require("chalk"));
var sqlFormatter_1 = require("@sqltools/formatter/lib/sqlFormatter");
var PlatformTools_1 = require("../platform/PlatformTools");
/**
 * Generates a new migration file with sql needs to be executed to update schema.
 */
var MigrationGenerateCommand = /** @class */ (function () {
    function MigrationGenerateCommand() {
        this.command = "migration:generate";
        this.describe = "Generates a new migration file with sql needs to be executed to update schema.";
        this.aliases = "migrations:generate";
    }
    MigrationGenerateCommand.prototype.builder = function (args) {
        return args
            .option("c", {
            alias: "connection",
            default: "default",
            describe: "Name of the connection on which run a query."
        })
            .option("n", {
            alias: "name",
            describe: "Name of the migration class.",
            demand: true,
            type: "string"
        })
            .option("d", {
            alias: "dir",
            describe: "Directory where migration should be created."
        })
            .option("p", {
            alias: "pretty",
            type: "boolean",
            default: false,
            describe: "Pretty-print generated SQL",
        })
            .option("f", {
            alias: "config",
            default: "ormconfig",
            describe: "Name of the file with connection configuration."
        })
            .option("o", {
            alias: "outputJs",
            type: "boolean",
            default: false,
            describe: "Generate a migration file on Javascript instead of Typescript",
        })
            .option("dr", {
            alias: "dryrun",
            type: "boolean",
            default: false,
            describe: "Prints out the contents of the migration instead of writing it to a file",
        })
            .option("ch", {
            alias: "check",
            type: "boolean",
            default: false,
            describe: "Verifies that the current database is up to date and that no migrations are needed. Otherwise exits with code 1.",
        })
            .option("t", {
            alias: "timestamp",
            type: "number",
            default: false,
            describe: "Custom timestamp for the migration name",
        });
    };
    MigrationGenerateCommand.prototype.handler = function (args) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function () {
            var timestamp, extension, filename, directory, connectionOptionsReader, connectionOptions, err_1, connectionOptionsReader, connectionOptions, upSqls_1, downSqls_1, connection, sqlInMemory, fileContent, path, err_2;
            return (0, tslib_1.__generator)(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (args._[0] === "migrations:generate") {
                            console.log("'migrations:generate' is deprecated, please use 'migration:generate' instead");
                        }
                        timestamp = CommandUtils_1.CommandUtils.getTimestamp(args.timestamp);
                        extension = args.outputJs ? ".js" : ".ts";
                        filename = timestamp + "-" + args.name + extension;
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
                        directory = connectionOptions.cli ? connectionOptions.cli.migrationsDir : undefined;
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        _a.trys.push([4, 15, , 16]);
                        connectionOptionsReader = new ConnectionOptionsReader_1.ConnectionOptionsReader({
                            root: process.cwd(),
                            configName: args.config
                        });
                        return [4 /*yield*/, connectionOptionsReader.get(args.connection)];
                    case 5:
                        connectionOptions = _a.sent();
                        Object.assign(connectionOptions, {
                            synchronize: false,
                            migrationsRun: false,
                            dropSchema: false,
                            logging: false
                        });
                        upSqls_1 = [], downSqls_1 = [];
                        return [4 /*yield*/, (0, globals_1.createConnection)(connectionOptions)];
                    case 6:
                        connection = _a.sent();
                        _a.label = 7;
                    case 7:
                        _a.trys.push([7, , 9, 11]);
                        return [4 /*yield*/, connection.driver.createSchemaBuilder().log()];
                    case 8:
                        sqlInMemory = _a.sent();
                        if (args.pretty) {
                            sqlInMemory.upQueries.forEach(function (upQuery) {
                                upQuery.query = MigrationGenerateCommand.prettifyQuery(upQuery.query);
                            });
                            sqlInMemory.downQueries.forEach(function (downQuery) {
                                downQuery.query = MigrationGenerateCommand.prettifyQuery(downQuery.query);
                            });
                        }
                        sqlInMemory.upQueries.forEach(function (upQuery) {
                            upSqls_1.push("        await queryRunner.query(`" + upQuery.query.replace(new RegExp("`", "g"), "\\`") + "`" + MigrationGenerateCommand.queryParams(upQuery.parameters) + ");");
                        });
                        sqlInMemory.downQueries.forEach(function (downQuery) {
                            downSqls_1.push("        await queryRunner.query(`" + downQuery.query.replace(new RegExp("`", "g"), "\\`") + "`" + MigrationGenerateCommand.queryParams(downQuery.parameters) + ");");
                        });
                        return [3 /*break*/, 11];
                    case 9: return [4 /*yield*/, connection.close()];
                    case 10:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 11:
                        if (!upSqls_1.length) {
                            if (args.check) {
                                console.log(chalk_1.default.green("No changes in database schema were found"));
                                process.exit(0);
                            }
                            else {
                                console.log(chalk_1.default.yellow("No changes in database schema were found - cannot generate a migration. To create a new empty migration use \"typeorm migration:create\" command"));
                                process.exit(1);
                            }
                        }
                        else if (!args.name) {
                            console.log(chalk_1.default.yellow("Please specify a migration name using the `-n` argument"));
                            process.exit(1);
                        }
                        fileContent = args.outputJs ?
                            MigrationGenerateCommand.getJavascriptTemplate(args.name, timestamp, upSqls_1, downSqls_1.reverse()) :
                            MigrationGenerateCommand.getTemplate(args.name, timestamp, upSqls_1, downSqls_1.reverse());
                        if (directory && !directory.startsWith("/")) {
                            directory = process.cwd() + "/" + directory;
                        }
                        path = (directory ? (directory + "/") : "") + filename;
                        if (args.check) {
                            console.log(chalk_1.default.yellow("Unexpected changes in database schema were found in check mode:\n\n".concat(chalk_1.default.white(fileContent))));
                            process.exit(1);
                        }
                        if (!args.dryrun) return [3 /*break*/, 12];
                        console.log(chalk_1.default.green("Migration ".concat(chalk_1.default.blue(path), " has content:\n\n").concat(chalk_1.default.white(fileContent))));
                        return [3 /*break*/, 14];
                    case 12: return [4 /*yield*/, CommandUtils_1.CommandUtils.createFile(path, fileContent)];
                    case 13:
                        _a.sent();
                        console.log(chalk_1.default.green("Migration ".concat(chalk_1.default.blue(path), " has been generated successfully.")));
                        _a.label = 14;
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_2 = _a.sent();
                        PlatformTools_1.PlatformTools.logCmdErr("Error during migration generation:", err_2);
                        process.exit(1);
                        return [3 /*break*/, 16];
                    case 16: return [2 /*return*/];
                }
            });
        });
    };
    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------
    /**
     * Formats query parameters for migration queries if parameters actually exist
     */
    MigrationGenerateCommand.queryParams = function (parameters) {
        if (!parameters || !parameters.length) {
            return "";
        }
        return ", ".concat(JSON.stringify(parameters));
    };
    /**
     * Gets contents of the migration file.
     */
    MigrationGenerateCommand.getTemplate = function (name, timestamp, upSqls, downSqls) {
        var migrationName = "".concat((0, StringUtils_1.camelCase)(name, true)).concat(timestamp);
        return "import {MigrationInterface, QueryRunner} from \"typeorm\";\n\nexport class ".concat(migrationName, " implements MigrationInterface {\n    name = '").concat(migrationName, "'\n\n    public async up(queryRunner: QueryRunner): Promise<void> {\n").concat(upSqls.join("\n"), "\n    }\n\n    public async down(queryRunner: QueryRunner): Promise<void> {\n").concat(downSqls.join("\n"), "\n    }\n\n}\n");
    };
    /**
     * Gets contents of the migration file in Javascript.
     */
    MigrationGenerateCommand.getJavascriptTemplate = function (name, timestamp, upSqls, downSqls) {
        var migrationName = "".concat((0, StringUtils_1.camelCase)(name, true)).concat(timestamp);
        return "const { MigrationInterface, QueryRunner } = require(\"typeorm\");\n\nmodule.exports = class ".concat(migrationName, " {\n    name = '").concat(migrationName, "'\n\n    async up(queryRunner) {\n").concat(upSqls.join("\n"), "\n    }\n\n    async down(queryRunner) {\n").concat(downSqls.join("\n"), "\n    }\n}\n");
    };
    /**
     *
     */
    MigrationGenerateCommand.prettifyQuery = function (query) {
        var formattedQuery = (0, sqlFormatter_1.format)(query, { indent: "    " });
        return "\n" + formattedQuery.replace(/^/gm, "            ") + "\n        ";
    };
    return MigrationGenerateCommand;
}());
exports.MigrationGenerateCommand = MigrationGenerateCommand;

//# sourceMappingURL=MigrationGenerateCommand.js.map
