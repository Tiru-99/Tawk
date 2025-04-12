"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verfiyJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const verfiyJWT = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = ((_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1]) || req.cookies.jwtToken;
    if (!token) {
        res.status(401).json({
            message: "Incoming Token not found"
        });
        return;
    }
    try {
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const existingUser = yield prisma_1.default.user.findUnique({
            where: {
                id: decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.id
            }
        });
        req.user = existingUser;
        next();
    }
    catch (e) {
        res.status(400).json({ error: "Invalid token" });
    }
});
exports.verfiyJWT = verfiyJWT;
