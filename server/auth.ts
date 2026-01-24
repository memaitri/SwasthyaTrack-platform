import { Router } from "express";

const router = Router();

// Placeholder auth routes - implement as needed
router.post("/login", (req, res) => {
  res.status(501).json({ message: "Auth not implemented yet" });
});

router.post("/logout", (req, res) => {
  res.status(501).json({ message: "Auth not implemented yet" });
});

export default router;