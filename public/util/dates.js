db.jeff_images.aggregate(
   [
    {
        "$unwind":
          {
            "path": "$files"
          }
      },
      {
          "$project":{
              "_id": 1,
              "files.filename": 1
          }
      },
      { "$group":
        {
            "_id" : "$_id",
            "mdate": { "$max": "$files.filename" }
         }
      }
   ]
)

db.jeff_images.update(
{ "_id" : ObjectId("59d6e7df92e66a1c8c848208")},
{"$set": {"nextNum" : NumberInt(5) } })