import { Request, Response } from "express";
import prisma from "../utils/prisma";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';

export const handleSignUp = async (req: Request, res: Response) => {
  const { email, password, name, imageUrl } = req.body;

  try {
    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      return res.status(400).json({
        message: "User with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        imageUrl: imageUrl || null
      }
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl
      }
    });
  } catch (error) {
    console.log("Something went wrong while registering the user", error);
    res.status(500).json({
      message: "Something went wrong while registering the user"
    });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (!userExists) {
      return res.status(401).json({
        message: "User with this email does not exist"
      });
    }

    const comparePassword = await bcrypt.compare(password, userExists.password);

    if (!comparePassword) {
      return res.status(401).json({
        message: "Invalid Password or Email"
      });
    }

    const jwtToken = jwt.sign({ id: userExists.id }, process.env.JWT_SECRET!);

    const options = {
      httpOnly: true,
      secure: true, 
      sameSite: 'none' as const, // CRITICAL! Required for cross-origin cookies
      path: '/', // Make cookie available to all routes
    };


    res.status(200)
      .cookie("jwtToken", jwtToken, options)
      .json({
        message: "User has been successfully Logged In",
        userId: userExists.id,
        name: userExists.name,
        imageUrl: userExists.imageUrl,
        email: userExists.email
      });
  } catch (error) {
    console.log("this is the error", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error
    });
  }
};

//controller to protect routes at the frontend 
export const checkAuth = async (req: Request, res: Response) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    console.log("No incoming token found");
    return res.status(200).json({
      message: "Unauthorized User",
      authenticated: false
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!);
    res.status(200).json({
      message: "Authenticated",
      token: decodedToken,
      authenticated: true
    });
  } catch (error) {
    console.log("Something went wrong", error);
    res.status(401).json({
      message: "Unauthorized",
      authenticated: false
    });
  }
};

export const logout = (req: Request, res: Response) => {
  const token = req.cookies.jwtToken;

  if (!token) {
    return res.status(401).json({
      message: "No sign in, no logout",
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!);

    if (decodedToken) {
      // clear the cookie
      res.clearCookie("jwtToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // only send cookie over https in production
        sameSite: "strict",
      });

      return res.status(200).json({
        message: "Logged out successfully",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const { id } = req.params;
  console.log("The request is coming into backend", id);

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: id }
      },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true
      }
    });
    console.log("the users are ", users);

    // Get chats where the user is a participant (individual chats only)
    const userChats = await prisma.chat.findMany({
      where: {
        isGroupChat: false,
        participants: {
          some: {
            userId: id
          }
        }
      },
      include: {
        participants: {
          select: {
            userId: true,
          }
        }
      }
    });

    // Extract all user IDs that have individual chats with the logged-in user
    const usersWithExistingChats = userChats.flatMap((chat) =>
      chat.participants
        .filter((participant) => participant.userId !== id)
        .map((participant) => participant.userId)
    );

    // Filter out users who already have individual chats with the logged-in user
    const filteredUsers = users.filter(user => !usersWithExistingChats.includes(user.id));
    console.log("the filtered users are ", filteredUsers);
    res.status(200).json({
      message: "Users Fetched Successfully",
      users: filteredUsers
    });
  } catch (error) {
    console.log("Something went wrong while fetching the users list", error);
    res.status(500).json({
      message: "Something went wrong while fetching the data",
      error: error
    });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: id },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        email: true,
      },
    });


    res.status(200).json({
      message: "Users fetched successfully",
      users
    });
  } catch (error) {
    console.log("Something went wrong while getting users", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error
    });
  }
};

export const health = async (req: Request, res: Response) => {
  const token = (req as any).user;
  console.log("this is my fetched token", token);
  res.send("this is the health check router");
};