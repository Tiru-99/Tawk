import { Router } from "express";
import { createChat, createGroupChat, getChats , markChatAsSeen } from "../controllers/chat.controller";

const router = Router(); 

router.route("/singlechat").post(createChat);
router.route("/groupchat").post(createGroupChat);
router.route("/getchats/:id").get(getChats);
router.route("/resetseen").post(markChatAsSeen); 



export default router;  