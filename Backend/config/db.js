import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Connect using the URI from your .env file (SRS 3.8.1)
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Exit process with failure if connection fails
    process.exit(1); 
  }
};

export default connectDB;