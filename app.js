const addDays = require("date-fns/addDays");
const express = require("express");
const app = express();
app.use(express.json());

var isValid = require("date-fns/isValid");
var format = require("date-fns/format");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbpath = path.join(__dirname, "todoApplication.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB error: ${e.message};`);
    process.exit(1);
  }
};

initializeDbAndServer();

let statusProperties = ["TO DO", "IN PROGRESS", "DONE"];
let priorityProperties = ["HIGH", "MEDIUM", "LOW"];
let categoryProperties = ["WORK", "HOME", "LEARNING"];

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const convertDateObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriority = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
// get todos API 1

app.get("/todos/", async (request, response) => {
  const { search_q = " ", status, priority, category } = request.query;
  let getTodoQuery = "";
  let data = "";

  switch (true) {
    case hasStatusProperty(request.query):
      if (statusProperties.includes(status)) {
        getTodoQuery = `
        SELECT 
          * 
        FROM 
          todo 
        WHERE 
          todo LIKE '%${search_q}%' 
          AND status = '${status}' 
        `;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriorityProperty(request.query):
      if (priorityProperties.includes(priority)) {
        getTodoQuery = `
        SELECT 
          * 
        FROM 
          todo 
        WHERE 
          todo LIKE '%${search_q}%' 
          AND priority = '${priority}'
        `;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasPriorityAndStatusProperty(request.query):
      if (priorityProperties.includes(priority)) {
        if (statusProperties.includes(status)) {
          getTodoQuery = `
                SELECT
                  *
                FROM
                  todo
                WHERE
                  todo LIKE '%${search_q}%'
                  AND priority = '${priority}',
                  AND status = '${status}'`;
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategoryAndStatusProperty(request.query):
      if (categoryProperties.includes(category)) {
        if (statusProperties.includes(status)) {
          getTodoQuery = `
                SELECT
                  *
                FROM 
                  todo
                WHERE
                  todo LIKE '%${search_q}%'
                  AND category = '${category}
                  AND status = '${status};`;
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryProperty(request.query):
      if (categoryProperties.includes(category)) {
        getTodoQuery = `
            SELECT 
              *
            FROM
              todo
            WHERE
              category = '${category}'`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndPriority(request.query):
      if (categoryProperties.includes(category)) {
        if (priorityProperties.includes(priority)) {
          getTodoQuery = `
                SELECT
                  *
                FROM
                  todo
                WHERE
                  todo LIKE '%${search_q}%'
                  AND category = '${category}'
                  AND priority = '${priority}'
                  `;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;

    default:
      getTodoQuery = `
        SELECT
          *
        FROM
          todo 
        WHERE
          todo LIKE '%${search_q}%';`;
      break;
  }

  try {
    data = await db.all(getTodoQuery);
    response.send(data.map((todo) => convertDbObjectToResponseObject(todo)));
  } catch (e) {
    console.log(`DB error: ${e.message}`);
  }
});

// get todo API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT 
      *
    FROM 
      todo
    WHERE 
      id = ${todoId}`;
  const data = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(data));
});

// get duedate API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const result = isValid(new Date(date));
  if (result) {
    const getTodoQuery = `
    SELECT
      *
    FROM 
      todo
    WHERE 
      due_date = '${date}'`;
    const data = await db.all(getTodoQuery);
    response.send(data.map((todo) => convertDateObjectToResponseObject(todo)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

// post todo API 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  if (priorityProperties.includes(priority)) {
    if (statusProperties.includes(status)) {
      if (categoryProperties.includes(category)) {
        if (isValid(new Date(dueDate))) {
          const postTodoQuery = `
            INSERT INTO
              todo (id,todo,priority,status,category,due_date)
            VALUES
            (
              ${id},
              '${todo}',
              '${priority}',
              '${status}',
              '${category}',
              '${dueDate}'
            );`;
          await db.run(postTodoQuery);
          response.send("Todo Successfully Added");
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Priority");
  }
});

// put todo API 5

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn;
  const requestBody = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
  }
  const getTodoQuery = `
  SELECT 
    * 
  FROM 
    todo 
  WHERE 
    id = ${todoId}`;

  const data = await db.get(getTodoQuery);
  const {
    status = data.status,
    priority = data.priority,
    todo = data.todo,
    category = data.category,
    dueDate = data.due_date,
  } = request.body;

  if (statusProperties.includes(status)) {
    if (priorityProperties.includes(priority)) {
      if (categoryProperties.includes(category)) {
        const result = isValid(new Date(dueDate));
        if (result) {
          const date = format(new Date(dueDate), "yyyy-MM-dd");
          const putTodoQuery = `
          UPDATE todo
          SET
            status = '${status}',
            priority = '${priority}',
            todo = '${todo}',
            category = '${category}',
            due_date = '${date}'
          WHERE
            id = ${todoId}`;
          await db.run(putTodoQuery);
          response.send(`${updateColumn} Updated`);
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Status");
  }
});

// delete todo API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id = '${todoId}'`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
