"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JunctionEntityMetadataBuilder = void 0;
var tslib_1 = require("tslib");
var MysqlDriver_1 = require("../driver/mysql/MysqlDriver");
var ColumnMetadata_1 = require("../metadata/ColumnMetadata");
var EntityMetadata_1 = require("../metadata/EntityMetadata");
var ForeignKeyMetadata_1 = require("../metadata/ForeignKeyMetadata");
var IndexMetadata_1 = require("../metadata/IndexMetadata");
var AuroraDataApiDriver_1 = require("../driver/aurora-data-api/AuroraDataApiDriver");
var OracleDriver_1 = require("../driver/oracle/OracleDriver");
var error_1 = require("../error");
/**
 * Creates EntityMetadata for junction tables.
 * Junction tables are tables generated by many-to-many relations.
 */
var JunctionEntityMetadataBuilder = /** @class */ (function () {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function JunctionEntityMetadataBuilder(connection) {
        this.connection = connection;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Builds EntityMetadata for the junction of the given many-to-many relation.
     */
    JunctionEntityMetadataBuilder.prototype.build = function (relation, joinTable) {
        var _this = this;
        var referencedColumns = this.collectReferencedColumns(relation, joinTable);
        var inverseReferencedColumns = this.collectInverseReferencedColumns(relation, joinTable);
        var joinTableName = joinTable.name || this.connection.namingStrategy.joinTableName(relation.entityMetadata.tableNameWithoutPrefix, relation.inverseEntityMetadata.tableNameWithoutPrefix, relation.propertyPath, relation.inverseRelation ? relation.inverseRelation.propertyName : "");
        var entityMetadata = new EntityMetadata_1.EntityMetadata({
            connection: this.connection,
            args: {
                target: "",
                name: joinTableName,
                type: "junction",
                database: joinTable.database || relation.entityMetadata.database,
                schema: joinTable.schema || relation.entityMetadata.schema,
            }
        });
        entityMetadata.build();
        // create original side junction columns
        var junctionColumns = referencedColumns.map(function (referencedColumn) {
            var joinColumn = joinTable.joinColumns ? joinTable.joinColumns.find(function (joinColumnArgs) {
                return (!joinColumnArgs.referencedColumnName || joinColumnArgs.referencedColumnName === referencedColumn.propertyName) &&
                    !!joinColumnArgs.name;
            }) : undefined;
            var columnName = joinColumn && joinColumn.name ? joinColumn.name
                : _this.connection.namingStrategy.joinTableColumnName(relation.entityMetadata.tableNameWithoutPrefix, referencedColumn.propertyName, referencedColumn.databaseName);
            return new ColumnMetadata_1.ColumnMetadata({
                connection: _this.connection,
                entityMetadata: entityMetadata,
                referencedColumn: referencedColumn,
                args: {
                    target: "",
                    mode: "virtual",
                    propertyName: columnName,
                    options: {
                        name: columnName,
                        length: !referencedColumn.length
                            && (_this.connection.driver instanceof MysqlDriver_1.MysqlDriver || _this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver)
                            && (referencedColumn.generationStrategy === "uuid" || referencedColumn.type === "uuid")
                            ? "36"
                            : referencedColumn.length,
                        width: referencedColumn.width,
                        type: referencedColumn.type,
                        precision: referencedColumn.precision,
                        scale: referencedColumn.scale,
                        charset: referencedColumn.charset,
                        collation: referencedColumn.collation,
                        zerofill: referencedColumn.zerofill,
                        unsigned: referencedColumn.zerofill ? true : referencedColumn.unsigned,
                        enum: referencedColumn.enum,
                        enumName: referencedColumn.enumName,
                        nullable: false,
                        primary: true,
                    }
                }
            });
        });
        // create inverse side junction columns
        var inverseJunctionColumns = inverseReferencedColumns.map(function (inverseReferencedColumn) {
            var joinColumn = joinTable.inverseJoinColumns ? joinTable.inverseJoinColumns.find(function (joinColumnArgs) {
                return (!joinColumnArgs.referencedColumnName || joinColumnArgs.referencedColumnName === inverseReferencedColumn.propertyName) &&
                    !!joinColumnArgs.name;
            }) : undefined;
            var columnName = joinColumn && joinColumn.name ? joinColumn.name
                : _this.connection.namingStrategy.joinTableInverseColumnName(relation.inverseEntityMetadata.tableNameWithoutPrefix, inverseReferencedColumn.propertyName, inverseReferencedColumn.databaseName);
            return new ColumnMetadata_1.ColumnMetadata({
                connection: _this.connection,
                entityMetadata: entityMetadata,
                referencedColumn: inverseReferencedColumn,
                args: {
                    target: "",
                    mode: "virtual",
                    propertyName: columnName,
                    options: {
                        length: !inverseReferencedColumn.length
                            && (_this.connection.driver instanceof MysqlDriver_1.MysqlDriver || _this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver)
                            && (inverseReferencedColumn.generationStrategy === "uuid" || inverseReferencedColumn.type === "uuid")
                            ? "36"
                            : inverseReferencedColumn.length,
                        width: inverseReferencedColumn.width,
                        type: inverseReferencedColumn.type,
                        precision: inverseReferencedColumn.precision,
                        scale: inverseReferencedColumn.scale,
                        charset: inverseReferencedColumn.charset,
                        collation: inverseReferencedColumn.collation,
                        zerofill: inverseReferencedColumn.zerofill,
                        unsigned: inverseReferencedColumn.zerofill ? true : inverseReferencedColumn.unsigned,
                        enum: inverseReferencedColumn.enum,
                        enumName: inverseReferencedColumn.enumName,
                        name: columnName,
                        nullable: false,
                        primary: true,
                    }
                }
            });
        });
        this.changeDuplicatedColumnNames(junctionColumns, inverseJunctionColumns);
        // set junction table columns
        entityMetadata.ownerColumns = junctionColumns;
        entityMetadata.inverseColumns = inverseJunctionColumns;
        entityMetadata.ownColumns = (0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(junctionColumns), false), (0, tslib_1.__read)(inverseJunctionColumns), false);
        entityMetadata.ownColumns.forEach(function (column) { return column.relationMetadata = relation; });
        // create junction table foreign keys
        // Note: UPDATE CASCADE clause is not supported in Oracle.
        entityMetadata.foreignKeys = relation.createForeignKeyConstraints ? [
            new ForeignKeyMetadata_1.ForeignKeyMetadata({
                entityMetadata: entityMetadata,
                referencedEntityMetadata: relation.entityMetadata,
                columns: junctionColumns,
                referencedColumns: referencedColumns,
                onDelete: relation.onDelete || "CASCADE",
                onUpdate: this.connection.driver instanceof OracleDriver_1.OracleDriver ? "NO ACTION" : relation.onUpdate || "CASCADE",
            }),
            new ForeignKeyMetadata_1.ForeignKeyMetadata({
                entityMetadata: entityMetadata,
                referencedEntityMetadata: relation.inverseEntityMetadata,
                columns: inverseJunctionColumns,
                referencedColumns: inverseReferencedColumns,
                onDelete: relation.inverseRelation ? relation.inverseRelation.onDelete : "CASCADE",
                onUpdate: this.connection.driver instanceof OracleDriver_1.OracleDriver
                    ? "NO ACTION"
                    : relation.inverseRelation
                        ? relation.inverseRelation.onUpdate
                        : "CASCADE",
            }),
        ] : [];
        // create junction table indices
        entityMetadata.ownIndices = [
            new IndexMetadata_1.IndexMetadata({
                entityMetadata: entityMetadata,
                columns: junctionColumns,
                args: {
                    target: entityMetadata.target,
                    synchronize: true
                }
            }),
            new IndexMetadata_1.IndexMetadata({
                entityMetadata: entityMetadata,
                columns: inverseJunctionColumns,
                args: {
                    target: entityMetadata.target,
                    synchronize: true
                }
            })
        ];
        // finally return entity metadata
        return entityMetadata;
    };
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Collects referenced columns from the given join column args.
     */
    JunctionEntityMetadataBuilder.prototype.collectReferencedColumns = function (relation, joinTable) {
        var hasAnyReferencedColumnName = joinTable.joinColumns ? joinTable.joinColumns.find(function (joinColumn) { return !!joinColumn.referencedColumnName; }) : false;
        if (!joinTable.joinColumns || (joinTable.joinColumns && !hasAnyReferencedColumnName)) {
            return relation.entityMetadata.columns.filter(function (column) { return column.isPrimary; });
        }
        else {
            return joinTable.joinColumns.map(function (joinColumn) {
                var referencedColumn = relation.entityMetadata.columns.find(function (column) { return column.propertyName === joinColumn.referencedColumnName; });
                if (!referencedColumn)
                    throw new error_1.TypeORMError("Referenced column ".concat(joinColumn.referencedColumnName, " was not found in entity ").concat(relation.entityMetadata.name));
                return referencedColumn;
            });
        }
    };
    /**
     * Collects inverse referenced columns from the given join column args.
     */
    JunctionEntityMetadataBuilder.prototype.collectInverseReferencedColumns = function (relation, joinTable) {
        var hasInverseJoinColumns = !!joinTable.inverseJoinColumns;
        var hasAnyInverseReferencedColumnName = hasInverseJoinColumns ? joinTable.inverseJoinColumns.find(function (joinColumn) { return !!joinColumn.referencedColumnName; }) : false;
        if (!hasInverseJoinColumns || (hasInverseJoinColumns && !hasAnyInverseReferencedColumnName)) {
            return relation.inverseEntityMetadata.primaryColumns;
        }
        else {
            return joinTable.inverseJoinColumns.map(function (joinColumn) {
                var referencedColumn = relation.inverseEntityMetadata.ownColumns.find(function (column) { return column.propertyName === joinColumn.referencedColumnName; });
                if (!referencedColumn)
                    throw new error_1.TypeORMError("Referenced column ".concat(joinColumn.referencedColumnName, " was not found in entity ").concat(relation.inverseEntityMetadata.name));
                return referencedColumn;
            });
        }
    };
    JunctionEntityMetadataBuilder.prototype.changeDuplicatedColumnNames = function (junctionColumns, inverseJunctionColumns) {
        var _this = this;
        junctionColumns.forEach(function (junctionColumn) {
            inverseJunctionColumns.forEach(function (inverseJunctionColumn) {
                if (junctionColumn.givenDatabaseName === inverseJunctionColumn.givenDatabaseName) {
                    var junctionColumnName = _this.connection.namingStrategy.joinTableColumnDuplicationPrefix(junctionColumn.propertyName, 1);
                    junctionColumn.propertyName = junctionColumnName;
                    junctionColumn.givenDatabaseName = junctionColumnName;
                    var inverseJunctionColumnName = _this.connection.namingStrategy.joinTableColumnDuplicationPrefix(inverseJunctionColumn.propertyName, 2);
                    inverseJunctionColumn.propertyName = inverseJunctionColumnName;
                    inverseJunctionColumn.givenDatabaseName = inverseJunctionColumnName;
                }
            });
        });
    };
    return JunctionEntityMetadataBuilder;
}());
exports.JunctionEntityMetadataBuilder = JunctionEntityMetadataBuilder;

//# sourceMappingURL=JunctionEntityMetadataBuilder.js.map
