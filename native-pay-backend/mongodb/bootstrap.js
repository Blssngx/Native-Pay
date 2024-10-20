import mongoose from "mongoose";
import fs from 'fs';

// Load schema dynamically from a JSON file
const schemaData = JSON.parse(fs.readFileSync('./mongodb/schema.json', 'utf8'));
const userSchema = new mongoose.Schema(schemaData);

const DATABASE_URL="mongodb+srv://blessinghove69:SyZdxnA6Jgd28B6S@cluster0.s0d7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

const User = mongoose.model('User', userSchema);

async function connectAndPopulate(jsonFilePath) {
  try {
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    

    // Read and parse the data from the JSON file
    const data = fs.readFileSync(jsonFilePath, 'utf8');
    const users = JSON.parse(data);
    console.log(users);

    // await User.remove({}, ()=>{});

    // Insert data into the collection
    await User.insertMany(users);
    console.log('Database populated with JSON data');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.connection.close();
  }
}

// Call the function with the JSON data file path
connectAndPopulate('./mongodb/input.json');
