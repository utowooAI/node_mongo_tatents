const mongoose = require('mongoose');

class MultiTenantManager {
	constructor(config) {
		this.dbConnections = {};
		this.tenantField = "tenantId";
		this.strategy = config.strategy || "collection"; // 默认为每个租户一个集合
		this.connect(config);
	}

	async connect({ uri, tenantStrategyOptions }) {
		if (this.strategy === "database") {
			// 每个租户一个数据库
			// 根据tenantId连接到对应的数据库
			// 这里假设tenantStrategyOptions包含一个获取租户数据库名称的方法
			const getTenantDbName = tenantStrategyOptions.getTenantDbName;
			this.getDatabaseConnection = (tenantId) => {
				if (!this.dbConnections[tenantId]) {
					const dbUri = `${uri}/${getTenantDbName(tenantId)}`;
					this.dbConnections[tenantId] = mongoose.createConnection(dbUri, {
						useNewUrlParser: true,
						useUnifiedTopology: true,
					});
				}
				return this.dbConnections[tenantId];
			};
		} else if (this.strategy === "collection") {
			// 每个租户一个集合
			this.dbConnection = await mongoose.createConnection(uri, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
			});
		}
	}

	async close() {
		if (this.strategy === "database") {
			// 每个租户一个数据库
			// 关闭数据库连接
			for (const tenantId in this.dbConnections) {
				await this.dbConnections[tenantId].close();
			}
		} else if (this.strategy === "collection") {
			// 每个租户一个集合
			// 关闭数据库连接
			await this.dbConnection.close();
			this.dbConnection = null;
		}
	}

	// 获取租户ID的方法
	getModel(modelName, schema, req) {
		let Model;
		switch (this.strategy) {
			case "database":
				const connection = this.getDatabaseConnection(this.getTenantId(req));
				Model = connection.model(modelName, schema, modelName);
				break;
			case "collection":
				Model = this.dbConnection.model(
					modelName,
					schema,
					`${modelName}_${this.getTenantId(req)}`
				);
				break;
			// 其他策略处理...
		}
		return Model;
	}

	getTenantId(req) {
		// 根据实际应用情况获取租户ID，这里仅做示例
		if (req && req.headers && req.headers["x-tenant-id"]) {
			return req.headers["x-tenant-id"];
		}
		throw new Error("Missing tenant ID in the request context");
	}

	async createRecord(modelName, data, req) {
		const Model = this.getModel(modelName);
		data[this.tenantField] = this.getTenantId(req);
		const record = new Model(data);
		return await record.save();
	}

	async readRecord(modelName, id, req) {
		const Model = this.getModel(modelName);
		const query = {
			_id: mongoose.Types.ObjectId(id),
			[this.tenantField]: this.getTenantId(req),
		};
		const record = await Model.findOne(query);
		if (!record) throw new Error("Record not found");
		return record;
	}

	async updateRecord(modelName, id, updates, req) {
		const Model = this.getModel(modelName);
		const query = {
			_id: mongoose.Types.ObjectId(id),
			[this.tenantField]: this.getTenantId(req),
		};
		const options = { new: true };
		const updatedRecord = await Model.findOneAndUpdate(query, updates, options);
		if (!updatedRecord) throw new Error("Record not found or unable to update");
		return updatedRecord;
	}

	async deleteRecord(modelName, id, req) {
		const Model = this.getModel(modelName);
		const query = {
			_id: mongoose.Types.ObjectId(id),
			[this.tenantField]: this.getTenantId(req),
		};
		const deletedRecord = await Model.findOneAndDelete(query);
		if (!deletedRecord) throw new Error("Record not found or unable to delete");
		return deletedRecord;
	}

	async createUser(modelName, userData, req) {
		const User = this.getModel(modelName)); // 获取User模型
		userData.tenantId = this.getTenantId(req);
		const user = new User(userData);
		return await user.save();
	}

	async authenticate(username, password, req) {
		const User = this.getModel(modelName);
		const user = await User.findOne({
			username,
			tenantId: this.getTenantId(req),
		});
		if (!user) return false;

		const isMatch = await bcrypt.compare(password, user.password);
		return isMatch ? user : false;
	}

	async createUser(modelName, userData, req) {
		const Model = this.getModel(modelName);
		userData.tenantId = this.getTenantId(req);
		const record = new Model(userData);
		return await record.save();
	}

	async deleteUser(modelName, id, req) {
		const Model = this.getModel(modelName);
		const result = await Model.findByIdAndDelete(id);
		if (!result) throw new Error("Record not found or unable to delete");
		return { message: "Record successfully deleted" };
	}

	async updateUser(modelName, id, updateData, req) {
		const Model = this.getModel(modelName);
		const options = { new: true };
		const updatedRecord = await Model.findByIdAndUpdate(
			id,
			updateData,
			options
		);
		if (!updatedRecord) throw new Error("Record not found or unable to update");
		return updatedRecord;
	}

	async readUser(modelName, query, req) {
		const Model = this.getModel(modelName);
		query.tenantId = this.getTenantId(req);
		const record = await Model.findOne(query);
		if (!record) throw new Error("Record not found");
		return record;
	}

	// 简化的权限检查（实际应用可能需要更复杂的RBAC或ABAC系统）
	async checkPermission(user, requiredRole) {
		return user && user.roles.includes(requiredRole);
	}
}

module.exports = MultiTenantManager;

