// backend/controllers/rewardController.js
import Reward from "../models/Reward.js";

export const createReward = async (req, res) => {
  try {
    const { name, description, pointsRequired } = req.body;
    if (!name || !pointsRequired) return res.status(400).json({ message: "Name and points required" });

    const reward = await Reward.create({ name, description, pointsRequired });
    res.status(201).json(reward);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getRewards = async (req, res) => {
  try {
    const rewards = await Reward.find();
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
