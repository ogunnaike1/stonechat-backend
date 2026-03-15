const mongoose = require("mongoose")

const connect = async()=>{

    try {
        const connected = await mongoose.connect(process.env.mongo_URL);
        if(connected ){
            console.log("MongoDB connected successfully");
        }
        
    } catch (error) {
        console.error("MongoDB connection error:", error);
        
    }
}
module.exports = connect