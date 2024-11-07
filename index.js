const express = require('express');
const cors = require('cors');
const jwt=require('jsonwebtoken');
const cookieParser=require('cookie-parser')
const app=express();
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port=process.env.PORT || 1000;

app.use(cors({
  origin:['http://localhost:5173',
    'http://localhost:5174',
    'car-doctor-aeeaa.web.app',
    'car-doctor-aeeaa.firebaseapp.com'],
  credentials:true
}));
app.use(express.json());

app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.orljueh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleWare
const logger=async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl)
  next();
}
const verifyToken=async(req,res,next)=>{
  const token=req.cookies?.token;
  
  if(!token){
    return res.status(401).send({massage:'not authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
    if(err){
     
      return res.status(401).send({massage:'unauthorized'})
    }
    
    req.user=decoded;
    next();
  })
 
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const servicesCollection=client.db("carsDoctor").collection("services");
    const checkedOutCollection=client.db("carsDoctor").collection("checkOut")

    // auth related api
    app.post('/jwt',logger,async(req,res)=>{
      const user=req.body;
      console.log(user);
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h' })
      
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false,
        
      })
      .send({SUCCESS:true});
    })

    app.get('/services',logger,async(req,res)=>{
      const cursor=servicesCollection.find();
      const result=await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:id',logger,async(req,res)=>{
      const id=req.params.id;
      const quary={_id: new ObjectId(id)}

      const options = {
        
        // Include only the `title` and `imdb` fields in the returned document
        projection: {  title: 1, price: 1 ,service_id:1, img:1},
      };

      const result=await servicesCollection.findOne(quary,options);
      res.send(result)
    })
    app.post('/checkOut',async(req,res)=>{
      const checked=req.body;
      console.log(checked)
      const result=await checkedOutCollection.insertOne(checked)
      res.send(result)
    })
    app.get('/checkOut',logger,verifyToken,async(req,res)=>{
      console.log(req.query.email);
      // console.log('tok tok token',req.cookies.token);
      console.log('form',req.user)
      if(req.query.email !== req.user.email){
        return res.status(403).send({massage:'forbidden access'})
      }
      let query={};
      if(req.query?.email){
        query={email:req.query.email}
      }
      const cursor=checkedOutCollection.find(query);
      const result=await cursor.toArray();
      res.send(result)
    })

    app.delete('/checkOut/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await checkedOutCollection.deleteOne(query);
      res.send(result)
    })
    app.patch('/checkOut/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id : new ObjectId(id)}
      const updateBooking=req.body;
      console.log(updateBooking);
      const updateDoc={

        $set:{
          update:updateBooking.update
        },
      };
      const result=await checkedOutCollection.updateOne(filter,updateDoc);
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('doctor is running');
})

app.listen(port,()=>{
    console.log(`car doctor server is running ${port}`)
})