const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
	_id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // 或者直接省略此行，因为这是默认行为
	id: {
		type: String,
		required: true,
		unique: true,
		default: () => mongoose.Types.ObjectId().toHexString(),
	},
	tenantId: { type: String, required: true }, // 租户ID
	username: { type: String, unique: true, required: true },
	password: { type: String, required: true },
	email: {
		type: String,
		unique: true,
		sparse: true,
		match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
	},
	roles: [{ type: String }],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// 在保存用户之前对密码进行加密
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();
	const saltRounds = 10;
	this.password = await bcrypt.hash(this.password, saltRounds);
	next();
});



// 用户模型
module.exports = mongoose.model("User", userSchema);
