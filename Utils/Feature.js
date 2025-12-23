class FeatureApi {
  constructor(MongooseQueryApi, QueryStringApi) {
    this.MongooseQueryApi = MongooseQueryApi;
    this.QueryStringApi = QueryStringApi;
  }

  Fillter() {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const QueryStringObj = { ...this.QueryStringApi };
    const excludes = ["page", "limit", "skip", "sort", "fields", "keyword"];
    excludes.forEach((failds) => delete QueryStringObj[failds]);
    let QueryString = JSON.stringify(QueryStringObj);
    QueryString = QueryString.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );
    this.MongooseQueryApi = this.MongooseQueryApi.find(JSON.parse(QueryString));
    return this;
  }

  Sort() {
    if (this.QueryStringApi.sort) {
      const sortby = this.QueryStringApi.sort.split(",").join(" ");
      this.MongooseQueryApi = this.MongooseQueryApi.sort(sortby);
    } else {
      this.MongooseQueryApi = this.MongooseQueryApi.sort({ createdAt: -1 });
    }
    return this;
  }

  Fields() {
    if (this.QueryStringApi.fields) {
      const fileds = this.QueryStringApi.fields.split(",").join(" ");
      this.MongooseQueryApi = this.MongooseQueryApi.select(fileds);
    } else {
      this.MongooseQueryApi = this.MongooseQueryApi.select("-__v");
    }
    return this;
  }

  Search(modelName) {
    let QuerySearch = {};
    // if (modelName === "Products") {
    if (modelName === undefined) {
      if (this.QueryStringApi.keyword) {
        QuerySearch.$or = [
          { title: { $regex: new RegExp(this.QueryStringApi.keyword, "i") } },
          {
            description: {
              $regex: new RegExp(this.QueryStringApi.keyword, "i"),
            },
          },
        ];
      }
    } else if (modelName === "Users") {
      if (this.QueryStringApi.keyword) {
        QuerySearch.$or = [
          { name: { $regex: new RegExp(this.QueryStringApi.keyword, "i") } },
          { email: { $regex: new RegExp(this.QueryStringApi.keyword, "i") } },
          { phone: { $regex: new RegExp(this.QueryStringApi.keyword, "i") } },
        ];
      }
    } else {
      QuerySearch = {
        name: { $regex: new RegExp(this.QueryStringApi.keyword, "i") },
      };
    }
    this.MongooseQueryApi = this.MongooseQueryApi.find(QuerySearch);
    return this;
  }

  Paginate(countDoc) {
    const page = this.QueryStringApi.page * 1 || 1;
    const limit = this.QueryStringApi.limit * 1 || 100;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;
    const Pagination = {};
    Pagination.CurrentPage = page;
    Pagination.limit = limit;
    Pagination.numberOfPage = Math.ceil(countDoc / limit);
    Pagination.numberOfDocuments = countDoc;
    if (endIndex < countDoc) {
      Pagination.next = page + 1;
    }
    if (skip > 0) {
      Pagination.preve = page - 1;
    }
    this.MongooseQueryApi = this.MongooseQueryApi.skip(skip).limit(limit);
    this.PaginateResult = Pagination;
    return this;
  }
}
module.exports = FeatureApi;
