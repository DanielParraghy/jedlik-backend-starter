import { Request, Response, Router } from "express";
import Controller from "../interfaces/controller.interface";
import nsideModel from "./nside.model";

export default class nsideController implements Controller {
    public router = Router();
    private nsideM = nsideModel;

    constructor() {
        this.router.get("/api/ingatlan", this.getAll);
        this.router.get("/api/ingatlan/:id", this.getById);
        this.router.get("/api/ingatlan/keyword/:keyword", this.getByKeyword);
        this.router.get(`/api/ingatlan/:offset/:limit/:sortingfield/:ascdesc/:filter?`, this.getPaginatedData);
        this.router.post("/api/ingatlan", this.create);
        this.router.patch("/api/ingatlan/:id", this.modifyPATCH);
        this.router.put("/api/ingatlan/:id", this.modifyPUT);
        this.router.delete("/api/ingatlan/:id", this.delete);
    }

    private getAll = async (req: Request, res: Response) => {
        try {
            const data = await this.nsideM.find().populate("kategoria");
            // or:
            // const data = await this.nsideM.find().populate("virtualPop");
            res.send(data);
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private getById = async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            const document = await this.nsideM.findById(id).populate("kategoria", "-_id");
            if (document) {
                res.send(document);
            } else {
                res.status(404).send({ message: `Document with id ${id} not found!` });
            }
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private getByKeyword = async (req: Request, res: Response) => {
        // Example of filtering in both side:
        try {
            const myRegex = new RegExp(req.params.keyword, "i"); // "i" for case-insensitive

            // SQL to Aggregation samples:
            // https://www.mongodb.com/docs/manual/reference/sql-aggregation-comparison/
            // https://www.mongodb.com/docs/manual/tutorial/aggregation-zip-code-data-set/
            // https://www.practical-mongodb-aggregations.com/

            const data = await this.nsideM.aggregate([
                {
                    $lookup: { from: "kategoriak", foreignField: "_id", localField: "kategoria", as: "kategoria" },
                    // from: The name of the one-side collection!!!
                    // foreignField: Linking field of one-side collection (here the PK: _id)
                    // localField: Linking field of n-side collection (here the FK: kategoria)
                    // as: alias name, here "kategoria", but it can be anything you like
                },
                {
                    $match: { $or: [{ "kategoria.field1": myRegex }, { description: myRegex }] },
                    // $match: { "kategoria.field1": req.params.keyword },
                },
                {
                    // convert array of objects to simple array (alias name):
                    $unwind: "$kategoria",
                },
                { $project: { _id: 0, prepTime: 0, "kategoria._id": 0 } },
            ]);
            res.send(data);
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private getPaginatedData = async (req: Request, res: Response) => {
        try {
            const offset = parseInt(req.params.offset);
            const limit = parseInt(req.params.limit);
            const sortingfield = req.params.sortingfield;
            const ascdesc = req.params.ascdesc; // ASC or DESC
            let paginatedData = [];
            let count = 0;
            if (req.params.filter && req.params.filter != "") {
                const myRegex = new RegExp(req.params.filter, "i"); // i for case insensitive
                count = await this.nsideM.find({ $or: [{ name: myRegex }, { description: myRegex }] }).countDocuments();
                paginatedData = await this.nsideM
                    .find({ $or: [{ name: myRegex }, { description: myRegex }] })
                    .sort(`${ascdesc == "DESC" ? "-" : ""}${sortingfield}`)
                    .skip(offset)
                    .limit(limit);
            } else {
                count = await this.nsideM.countDocuments();
                paginatedData = await this.nsideM
                    .find({})
                    .sort(`${ascdesc == "DESC" ? "-" : ""}${sortingfield}`)
                    .skip(offset)
                    .limit(limit);
            }
            res.send({ count: count, data: paginatedData });
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private create = async (req: Request, res: Response) => {
        try {
            const body = req.body;
            const createdDocument = new this.nsideM({
                ...body,
            });
            const savedDocument = await createdDocument.save();
            res.send(savedDocument);
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private modifyPATCH = async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            const body = req.body;
            const updatedDoc = await this.nsideM.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate("kategoria", "-_id");
            if (updatedDoc) {
                res.send(updatedDoc);
            } else {
                res.status(404).send({ message: `Document with id ${id} not found!` });
            }
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private modifyPUT = async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            const body = req.body;
            const modificationResult = await this.nsideM.replaceOne({ _id: id }, body, { runValidators: true });
            if (modificationResult.modifiedCount) {
                const updatedDoc = await this.nsideM.findById(id).populate("kategoria", "-_id");
                res.send(updatedDoc);
            } else {
                res.status(404).send({ message: `Document with id ${id} not found!` });
            }
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };

    private delete = async (req: Request, res: Response) => {
        try {
            const id = req.params.id;
            const successResponse = await this.nsideM.findByIdAndDelete(id);
            if (successResponse) {
                res.sendStatus(200);
            } else {
                res.status(404).send({ message: `Document with id ${id} not found!` });
            }
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    };
}
