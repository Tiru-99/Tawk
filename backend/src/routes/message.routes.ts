import { Router } from "express";
import { getMessagesByChatId , saveMessage } from "../controllers/messages.controller";

const router = Router() ; 

router.route('/getmessages/:id/:incomingUserId').get(getMessagesByChatId);
router.route('/send-message').post(saveMessage);

export default router; 