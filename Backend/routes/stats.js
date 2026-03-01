const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation'); // Path to your Donation model
const User = require('../models/User');         // Path to your User model

router.get('/', async (req, res) => {
    try {
        // 1. Calculate Total Meals (Sum of all 'money' donations or count of 'food' items)
        const totalMealsData = await Donation.countDocuments({ type: 'food' });
        
        // 2. Calculate Families Helped (Unique recipients who received donations)
        const totalFamilies = await Donation.distinct('recipientId').then(ids => ids.length);
        
        // 3. Calculate Active Volunteers (Count users with 'volunteer' role)
        const totalVolunteers = await User.countDocuments({ role: 'volunteer' });

        res.json({
            totalMeals: totalMealsData || 0,
            totalFamilies: totalFamilies || 0,
            totalVolunteers: totalVolunteers || 0
        });
    } catch (err) {
        res.status(500).json({ message: "Error fetching live statistics" });
    }
});

module.exports = router;