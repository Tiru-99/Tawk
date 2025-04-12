"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messages_controller_1 = require("../controllers/messages.controller");
const router = (0, express_1.Router)();
router.route('/getmessages/:id/:incomingUserId').get(messages_controller_1.getMessagesByChatId);
router.route('/send-message').post(messages_controller_1.saveMessage);
exports.default = router;
