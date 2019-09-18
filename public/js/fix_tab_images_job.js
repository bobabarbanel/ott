

var myCursor = db.tab_images.find({},{_id:1});
var documentArray = myCursor.toArray();

documentArray.forEach(
    (doc) => db.tab_images.updateOne({_id:doc._id}, {$set: { job: doc._id}})
)
