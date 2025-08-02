import { useEffect, useState } from "react";
import axios from "../api/axios";
import NavUser from "../NavUser/NavUser";
import Footer from "../Footer/Footer";
import "../Home/Home.css";
import "./StudyInterface.css";
import MyCalendar from "./Calendar";


const StudyTracker = () => {
  const [showAchievements, setShowAchievements] = useState(false);
  const toggleAchievements = () => setShowAchievements((prev) => !prev);

  const [expandedFolderId, setExpandedFolderId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const [draggedTaskInfo, setDraggedTaskInfo] = useState(null);
  const [draggedFolderIndex, setDraggedFolderIndex] = useState(null);

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [sortModes, setSortModes] = useState({});
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);
  const [editFolderId, setEditFolderId] = useState(null);
  const [editedFolderName, setEditedFolderName] = useState("");


  const [folderColor, setNewFolderColor] = useState("#ffb3b3");
  const [courseName, setNewFolderName] = useState();
  const [newTask, setNewTask] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskStartDate, setTaskStartDate] = useState("");

  useEffect(() => {

        axios.get("/courses")
            .then(res => {
                const formatted = res.data.map(course => ({
                    id: course._id,
                    name: course.courseName,
                    color: course.folderColor, //|| newFolderColor,
                    tasks: course.tasks.map(task => ({
                        _id: task._id,
                        text: task.taskname,
                        completed: task.completed,
                        startDate: task.startDate,
                        deadline: task.deadline,
                        priority: task.priority || "medium",
                    })
                    )
                }))
                setFolders(formatted);
            })
            .catch((err) => console.error("Error fetching courses:", err));
    
        }, []);

  const handleSubmitCourse = (e) => {
    e.preventDefault();

    if (!courseName.trim()) return;

    axios
      .post("/courses", { courseName, folderColor })
      .then((result) => {
        if (result.status === 201) {
          const newFolder = {
            id: result.data._id,
            name: result.data.courseName,
            color: folderColor,
            tasks: [],
          };

          setFolders((prevFolders) => [...prevFolders, newFolder]);

                    setNewFolderName("");
                    setNewFolderColor("#ffb3b3");
                    setShowFolderForm(false);
                }
            })
            .catch(e => console.log(e));
    };

  const calculateProgress = (startDate, deadline) => {
    const start = new Date(startDate);
    const end = new Date(deadline);
    const now = new Date();

    if (now >= end) return 100;
    if (now <= start) return 0;

    const totalMs = end - start;
    const elapsedMs = now - start;

    return Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  };

  const getDaysLeft = (deadline) => {
    if (!deadline) return "";

    const [year, month, day] = deadline.split("-").map(Number);
    const dueDate = new Date(year, month - 1, day);
    const today = new Date();
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const timeDiff = dueDate.getTime() - todayDate.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

    if (dayDiff < 0) return "Overdue";
    if (dayDiff === 0) return "Due today";
    if (dayDiff === 1) return "Due tomorrow";
    return `${dayDiff} days left`;
  };

  const priorities = {
    urgent: { color: "#e53935", label: "Urgent" },
    high: { color: "#fb8c00", label: "High" },
    medium: { color: "#fdd835", label: "Medium" },
    low: { color: "#43a047", label: "Low" },
  };

  const handlePriorityCycle = (folderId, taskIndex) => {
    setFolders((prev) =>
      prev.map((folder) => {
        if (folder.id !== folderId) return folder;

        const updatedTasks = folder.tasks.map((task, index) => {
          if (index !== taskIndex) return task;

          const order = ["urgent", "high", "medium", "low"];
          const currentIndex = order.indexOf(task.priority || "medium");
          const nextPriority = order[(currentIndex + 1) % order.length];

          return { ...task, priority: nextPriority };
        });

        return { ...folder, tasks: updatedTasks };
      })
    );
  };

  const toggleSortMode = () => {
    const folderId = selectedFolderId;
    if (!folderId) return;

    const modes = ["none", "priority", "deadline"];
    const currentMode = sortModes[folderId] || "none";
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];

    setFolders((prevFolders) =>
      prevFolders.map((folder) => {
        if (folder.id !== folderId) return folder;

        if (nextMode === "none") {
          if (folder.tasksOriginal) {
            return {
              ...folder,
              tasks: folder.tasksOriginal,
              tasksOriginal: undefined,
            };
          }
          return folder;
        }

        const originalTasks = folder.tasksOriginal || folder.tasks;

        const sortedTasks = [...folder.tasks].sort((a, b) => {
          if (nextMode === "priority") {
            const priorityOrder = ["urgent", "high", "medium", "low"];
            const aIndex = priorityOrder.indexOf(a.priority || "low");
            const bIndex = priorityOrder.indexOf(b.priority || "low");
            return aIndex - bIndex;
          } else if (nextMode === "deadline") {
            const aDate = a.deadline
              ? new Date(a.deadline)
              : new Date(8640000000000000);
            const bDate = b.deadline
              ? new Date(b.deadline)
              : new Date(8640000000000000);
            return aDate - bDate;
          }
          return 0;
        });

        return {
          ...folder,
          tasks: sortedTasks,
          tasksOriginal: originalTasks,
        };
      })
    );

    setSortModes((prev) => ({ ...prev, [folderId]: nextMode }));
  };

const addTask = () => {
  if (!newTask.trim() || !selectedFolderId) return;

  // Only handle “create” here; if editIndex != null you’ll PUT later.
  if (editIndex !== null) return;

  // EDIT MODE: send updates to the server
  /*
  if (editIndex !== null) {
    const folder = folders.find(f => f.id === selectedFolderId);
    const t      = folder.tasks[editIndex];
    axios.put("/tasks", {
      id:        t._id,
      taskname:  newTask,
      startDate: taskStartDate,
      deadline:  taskDeadline
    })
    .then(res => {
      const updated = res.data;
      setFolders(prev =>
        prev.map(f =>
          f.id === selectedFolderId
            ? {
                ...f,
                tasks: f.tasks.map((task,i) =>
                  i === editIndex
                    ? {
                        ...task,
                        text:      updated.taskname,
                        startDate: updated.startDate,
                        deadline:  updated.deadline
                      }
                    : task
                )
              }
            : f
        )
      );
      // cleanup 
      setNewTask("");
      setEditIndex(null);
      setTaskStartDate("");
      setTaskDeadline("");
      setShowTaskForm(false);
    })
    .catch(err => console.error("Error updating task:", err));
    return;
  }*/

  axios
    .post("/tasks", {
      taskname:  newTask,
      course:    selectedFolderId,
      startDate: taskStartDate,
      deadline:  taskDeadline,
      priority:  "medium"
    })
    .then(res => {
      const t = res.data;  // the saved Task document

      // Mirror the same state update, but using the real t._id and fields
      setFolders(prev =>
        prev.map(folder =>
          folder.id === selectedFolderId
            ? {
                ...folder,
                tasks: [
                  ...folder.tasks,
                  {
                    _id:       t._id,
                    text:      t.taskname,
                    completed: t.completed,
                    startDate: t.startDate,
                    deadline:  t.deadline,
                    priority:  t.priority
                  }
                ]
              }
            : folder
        )
      );

      // Reset your form exactly as before
      setNewTask("");
      setEditIndex(null);
      setTaskDeadline("");
      setTaskStartDate("");
      setShowTaskForm(false);
    })
    .catch(err => console.error("Error adding task:", err));
};


  /*
  const addTask = () => {
    if (!newTask.trim() || !selectedFolderId) return;

    setFolders(
      folders.map((folder) => {
        if (folder.id === selectedFolderId) {
          const updatedTasks = [...folder.tasks];

          if (editIndex !== null) {
            updatedTasks[editIndex] = {
              ...updatedTasks[editIndex],
              text: newTask,
              deadline: taskDeadline,
              startDate: taskStartDate || updatedTasks[editIndex].startDate,
            };
          } else {
            updatedTasks.push({
              text: newTask,
              completed: false,
              startDate: taskStartDate || new Date().toISOString(),
              deadline: taskDeadline,
              priority: "medium",
            });
          }

          return { ...folder, tasks: updatedTasks };
        }
        return folder;
      })
    );

    setNewTask("");
    setEditIndex(null);
    setTaskDeadline("");
    setTaskStartDate("");
    setShowTaskForm(false);
  };
*/


  const toggleComplete = (folderId, index) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId
          ? {
              ...folder,
              tasks: folder.tasks.map((task, i) =>
                i === index ? { ...task, completed: !task.completed } : task
              ),
            }
          : folder
      )
    );
  };

  const editTask = (folderId, index) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    setNewTask(folder.tasks[index].text);
    setTaskDeadline(folder.tasks[index].deadline || "");
    setTaskStartDate(folder.tasks[index].startDate || "");
    setEditIndex(index);
    setSelectedFolderId(folderId);
    setShowTaskForm(true);
  };


  const updateTask = () => {
  if (editIndex === null) return;

  // Grab the task we’re editing
  const folder = folders.find(f => f.id === selectedFolderId);
  const t      = folder.tasks[editIndex];

  axios
    .put("/tasks", {
      id:        t._id,
      taskname:  newTask,
      startDate: taskStartDate,
      deadline:  taskDeadline
    })
    .then(res => {
      const updated = res.data;
      // Update state with the server’s response
      setFolders(prev =>
        prev.map(f =>
          f.id === selectedFolderId
            ? {
                ...f,
                tasks: f.tasks.map((task,i) =>
                  i === editIndex
                    ? {
                        ...task,
                        text:      updated.taskname,
                        startDate: updated.startDate,
                        deadline:  updated.deadline
                      }
                    : task
                )
              }
            : f
        )
      );
      // Cleanup
      setNewTask("");
      setEditIndex(null);
      setTaskStartDate("");
      setTaskDeadline("");
      setShowTaskForm(false);
    })
    .catch(err => console.error("Error updating task:", err));
};



const deleteTask = (folderId, index) => {
  if (!window.confirm("Delete task permanently?")) return;
  
  // Find the task’s real _id from state
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = folder.tasks[index];

  // Call DELETE /tasks with the task’s _id
  axios
    .delete("/tasks", { data: { id: t._id } })
    .then(() => {
      // Only update local state once the server confirms deletion
      setFolders(prev =>
        prev.map(f =>
          f.id === folderId
            ? { ...f, tasks: f.tasks.filter((_, i) => i !== index) }
            : f
        )
      );
    })
    .catch(err => console.error("Error deleting task:", err));
};





/*
    const deleteTask = (folderId, index) => {
        setFolders(prev =>
            prev.map(folder =>
                folder.id === folderId
                    ? {
                        ...folder,
                        tasks: folder.tasks.filter((_, i) => i !== index),
                    }
                    : folder
            )
        );
    };
*/

    const editFolder = (folderId, currentName, currentColor) => {
        setEditFolderId(folderId);
        setEditedFolderName(currentName);
        setNewFolderColor(currentColor);
    };

    const deleteFolder = (folderId) => {
        setFolders(prev => prev.filter(folder => folder.id !== folderId));

        if (selectedFolderId === folderId) {
            setSelectedFolderId(null);
            setExpandedFolderId(null);
        }
    };


  const palettes = {
    default: {
      "--palette-bg": "#ffffff",
      "--palette-dashboard-bg": "#f2c399",
      "--palette-sidebar-bg": "#ffe0c4",
      "--palette-widget-bg": "#ffe0c4",
      "--palette-header-bg": "#f44336",
      "--palette-header-text": "white",
      "--palette-add-btn": "#4caf50",
      "--palette-task-bg": "#f9f9f9",
      "--palette-task-done": "#888",
      "--palette-hover": "#ffdad7",
      "--palette-progress-bg": "#eee",
      "--palette-progress-bar": "#4caf50",
      "--accent": "#4caf50",
    },
    ocean: {
      "--palette-bg": "#e0f7fa",
      "--palette-dashboard-bg": "#b2ebf2",
      "--palette-sidebar-bg": "#4dd0e1",
      "--palette-widget-bg": "#80deea",
      "--palette-header-bg": "#00796b",
      "--palette-header-text": "white",
      "--palette-add-btn": "#00897b",
      "--palette-task-bg": "#b2dfdb",
      "--palette-task-done": "#004d40",
      "--palette-hover": "#a7ffeb",
      "--palette-progress-bg": "#e0f2f1",
      "--palette-progress-bar": "#004d40",
      "--accent": "#41489cff",
    },
    // Add more palettes if needed...
  };

  const applyPalette = (paletteName) => {
    const root = document.documentElement;
    const selected = palettes[paletteName];
    if (!selected) return;

    Object.entries(selected).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  return (
    <div className="page-container">
      <NavUser />

            <div className="dashboard">
                <div className="sidebar">
                    <div className="header">
                        To-Do List
                        <div className="button-group">
                            <button className="add-toggle" onClick={() => setShowAddMenu(!showAddMenu)}>+</button>
                            <button className="add-toggle" onClick={toggleSortMode} title={`Sort mode: ${sortModes[selectedFolderId] || "none"}`}>
                                {sortModes[selectedFolderId] === "none" ? "=" : sortModes[selectedFolderId] === "priority" ? "↑" : "↓"}
                            </button>
                            <button className="add-toggle" onClick={() => setShowOnlyUrgent(prev => !prev)}>
                                {showOnlyUrgent ? "¡" : "!"}
                            </button>
                        </div>
                        {showAddMenu && (
                            <div className="add-dropdown">
                                <div onClick={() => { setShowFolderForm(true); setShowTaskForm(false); setShowAddMenu(false); }}>
                                    📁 Add Course
                                </div>
                                <div onClick={() => { setShowTaskForm(true); setShowFolderForm(false); setShowAddMenu(false); }}>
                                    ➕ Add Task
                                </div>
                            </div>
                        )}
                    </div>

          {showTaskForm && selectedFolderId && (
            <div className="todo-input">
              <input
                type="text"
                placeholder="Add a task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <input
                type="date"
                value={taskStartDate}
                onChange={(e) => setTaskStartDate(e.target.value)}
                placeholder="Start date"
              />
              <input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                placeholder="Deadline"
              />
              <button //</div>onClick={addTask}>Add</button>
                onClick={editIndex !== null ? updateTask : addTask}
              >
              {editIndex !== null ? "Save" : "Add"}
                
                </button>

            </div>
          )}
          {/*where to do course add */}
          {showFolderForm && (
            <div className="folder-form">
              <input
                type="text"
                placeholder="Folder name"
                value={courseName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <input
                type="color"
                value={folderColor}
                onChange={(e) => setNewFolderColor(e.target.value)}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (!courseName.trim()) return;
                  handleSubmitCourse(e);
                }}
              >
                Create
              </button>
            </div>
          )}

          <ul className="folder-list">
            {folders.length > 0 ? (
              folders.map((folder, folderIndex) => (
                <li
                  key={folder.id}
                  className="folder-item"
                  draggable
                  onDragStart={() => setDraggedFolderIndex(folderIndex)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (
                      draggedFolderIndex === null ||
                      draggedFolderIndex === folderIndex
                    )
                      return;

                    const bounding = e.currentTarget.getBoundingClientRect();
                    const offset = e.clientY - bounding.top;
                    const dropBefore = offset < bounding.height / 2;
                    const newIndex = dropBefore ? folderIndex : folderIndex + 1;

                    const updated = [...folders];
                    const [moved] = updated.splice(draggedFolderIndex, 1);

                    const adjustedIndex =
                      newIndex > draggedFolderIndex ? newIndex - 1 : newIndex;

                    updated.splice(adjustedIndex, 0, moved);

                                        setFolders(updated);
                                        setDraggedFolderIndex(null);
                                    }}
                                    onDragEnd={() => setDraggedFolderIndex(null)}
                                >
                                    <div
                                        className="folder-header"
                                        onClick={() => {
                                            setExpandedFolderId(prev => prev === folder.id ? null : folder.id);
                                            setSelectedFolderId(folder.id);
                                        }}
                                        style={{
                                            backgroundColor: folder.id === expandedFolderId ? "#e3f2fd" : "#f5f5f5",
                                            borderLeft: `10px solid ${folder.color}`,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span style={{ flex: 1 }}>{folder.name}</span>
                                        { /*<div className="task-buttons">
                                            <button onClick={() => editFolder(folder.id, folder.name, folder.color)}>✏️O</button>
                                            <button onClick={() => deleteFolder(folder.id, folder.name, folder.color)}>❌XX</button>
                                        </div> */ }
                                    </div>

                                    {expandedFolderId === folder.id && (
                                        <ul className="todo-list">
                                            {folder.tasks.map((task, index) => (
                                                <li
                                                    key={index}
                                                    className={`${task.completed ? "completed" : ""} ${showOnlyUrgent && task.priority !== "urgent" ? "blur-task" : ""}`}
                                                    style={{ borderLeft: `6px solid ${folder.color}` }}
                                                    draggable
                                                    onDragStart={() => setDraggedTaskInfo({ folderId: folder.id, taskIndex: index })}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (!draggedTaskInfo) return;

                            const bounding =
                              e.currentTarget.getBoundingClientRect();
                            const offset = e.clientY - bounding.top;
                            const dropBefore = offset < bounding.height / 2;
                            const newIndex = dropBefore ? index : index + 1;

                            setFolders((prevFolders) => {
                              const updatedFolders = prevFolders.map((f) => ({
                                ...f,
                                tasks: [...f.tasks],
                              }));

                              const sourceFolder = updatedFolders.find(
                                (f) => f.id === draggedTaskInfo.folderId
                              );
                              const targetFolder = updatedFolders.find(
                                (f) => f.id === folder.id
                              );

                              if (!sourceFolder || !targetFolder)
                                return prevFolders;

                              // Remove the moved task from the source folder
                              const [movedTask] = sourceFolder.tasks.splice(
                                draggedTaskInfo.taskIndex,
                                1
                              );

                              // Adjust insertion if moving down within the same folder
                              let adjustedIndex = newIndex;
                              if (
                                folder.id === draggedTaskInfo.folderId &&
                                newIndex > draggedTaskInfo.taskIndex
                              ) {
                                adjustedIndex = newIndex - 1;
                              }

                              // Insert moved task at the new index in target folder
                              targetFolder.tasks.splice(
                                adjustedIndex,
                                0,
                                movedTask
                              );

                              return updatedFolders;
                            });

                                                        setDraggedTaskInfo(null);
                                                    }}
                                                    onDragEnd={() => setDraggedTaskInfo(null)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={task.completed}
                                                        onChange={() => toggleComplete(folder.id, index)}
                                                    />
                                                    <span>{task.text}</span>
                                                    {task.deadline && task.startDate && (
                                                        <div className="progress-wrapper">
                                                            <div className="progress-container">
                                                                <div
                                                                    className="progress-bar"
                                                                    style={{ width: `${calculateProgress(task.startDate, task.deadline)}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="due-date-label">{getDaysLeft(task.deadline)}</span>
                                                        </div>
                                                    )}
                                                    <div className="priority-tag"
                                                        style={{ backgroundColor: priorities[task.priority].color }}
                                                        title={priorities[task.priority].label}
                                                        onClick={() => handlePriorityCycle(folder.id, index)}>
                                                    </div>
                                                    <div className="task-buttons">
                                                        <button onClick={() => editTask(folder.id, index)}>✏️T?</button>
                                                        <button onClick={() => deleteTask(folder.id, index)}>❌TASK?</button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))
                        ) : (
                            <p className="loading-text">Loading...</p>
                        )}
                    </ul>
                </div>

        <div className="middle-column">
          <div className="image-container"></div>
          <div className="achievements-bar" onClick={toggleAchievements}>
            Achievement Tracker
          </div>
          {showAchievements && (
            <div className="achievements-content">
              <div className="palette-swatch-container">
                {Object.entries(palettes).map(([name, palette]) => (
                  <div
                    key={name}
                    className="palette-swatch"
                    style={{ backgroundColor: palette["--accent"] }}
                    onClick={() => applyPalette(name)}
                    title={name}
                  ></div>
                ))}
              </div>

              <p>⭐ You completed 3 Pomodoros today!</p>
              <p>📈 Your focus time increased by 12%</p>
            </div>
          )}
        </div>

                <div className="widgets">
                    <div className="widget calendar-widget">
                        <div className="header">Calendar</div>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <MyCalendar />
                        </div>
                    </div>
                    <div className="widget pomodoro-widget">
                        <div className="header">Pomodoro</div>
                    </div>
                </div>
            </div>

      {/* <div className="main"></div> */}
      <Footer />
    </div>
  );
};

export default StudyTracker;
