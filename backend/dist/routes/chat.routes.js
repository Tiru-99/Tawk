"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const router = (0, express_1.Router)();
router.route("/singlechat").post(chat_controller_1.createChat);
router.route("/groupchat").post(chat_controller_1.createGroupChat);
router.route("/getchats/:id").get(chat_controller_1.getChats);
exports.default = router;
