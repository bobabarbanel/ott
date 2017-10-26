var db = connect("localhost:27017/parts");
var cursor = db.images.aggregate([{ $match: {} }, { $project: { 
    "files.filename": 1, "files.dir": 1, _id: 0 } },
{ $unwind: { path: "$files" } }]);

while (cursor.hasNext()) {
    printjson(cursor.next());
}