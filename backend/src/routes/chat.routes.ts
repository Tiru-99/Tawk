import { Router } from "express";
import { createChat, createGroupChat, getChats } from "../controllers/chat.controller";

const router = Router(); 

router.route("/singlechat").post(createChat);
router.route("/groupchat").post(createGroupChat);
router.route("/getchats").get(getChats);


export default router;  