import { Router } from "express";
import { getMessagesByChatId } from "../controllers/messages.controller";

const router = Router() ; 

router.route('/getmessages/:id/:incomingUserId').get(getMessagesByChatId);

export default router; 