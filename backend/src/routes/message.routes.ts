import { Router } from "express";
import { getMessagesByChatId } from "../controllers/messages.controller";

const router = Router() ; 

router.route('/getmessages/:id').get(getMessagesByChatId);

export default router; 