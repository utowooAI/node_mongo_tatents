const mongoose = require("mongoose");

const TenantSchema = new mongoose.Schema({
	tenantId: { type: String, required: true, unique: true },
	name: { type: String, required: true },
	// ... 其他字段
});

module.exports = mongoose.model("Tenant", TenantSchema);
