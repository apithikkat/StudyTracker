import { useEffect, useState } from "react";
import axios from "../api/axios";
import NavUser from "../NavUser/NavUser";
import Footer from "../Footer/Footer";
import "../Home/Home.css";
import "./StudyInterface.css";
import MyCalendar from "./Calendar";
import confetti from "canvas-confetti";

const StudyTracker = () => {
  const [showAchievements, setShowAchievements] = useState(false);
  const [usedDaysCount, setUsedDaysCount] = useState(0);
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

  const allTasks = folders.flatMap(folder => folder.tasks);
  const totalCompleted = allTasks.filter(task => task.completed).length;
  const completedBeforeDeadline = allTasks.filter(task =>
    task.completed &&
    task.deadline &&
    new Date(task.completedAt || task.completedDate || Date.now()) <= new Date(task.deadline)
  ).length;

  const [earlyCompleteAnimTask, setEarlyCompleteAnimTask] = useState(null);

  useEffect(() => {
     axios.get("/courses")
    .then(res => {
      const formatted = res.data.map(course => ({
        id:    course._id,
        name:  course.courseName,
        color: course.folderColor || "#ffb3b3",
        tasks: course.tasks.map(t => ({
          _id:       t._id,
          text:      t.taskname,
          completed: t.completed,
          startDate: t.startDate,
          deadline:  t.deadline,
          priority:  t.priority
        }))
      }));
      setFolders(formatted);
    })
    .catch(err => console.error("Error loading courses:", err));
}, []);


  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]; // 'YYYY-MM-DD'
    const usedDays = JSON.parse(localStorage.getItem("usedDays") || "[]");

    if (!usedDays.includes(today)) {
      usedDays.push(today);
      localStorage.setItem("usedDays", JSON.stringify(usedDays));
    }

    setUsedDaysCount(usedDays.length);
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
  

    
  const handleUpdateCourse = (folderId) => {
  // guard empty name
  if (!editedFolderName.trim()) return;

  axios
    .put("/courses", {
      id:         folderId,
      courseName: editedFolderName.trim()
    })
    .then(res => {
      const updated = res.data;
      // update that folder’s name in local state
      setFolders(prev =>
        prev.map(f =>
          f.id === folderId
            ? { ...f, name: updated.courseName }
            : f
        )
      );
      // exit edit mode
      setEditFolderId(null);
      setEditedFolderName("");
    })
    .catch(err => console.error("Error updating course:", err));
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

  // Parse the ISO string (or "YYYY-MM-DD") into a Date
  const due = new Date(deadline);

  // Normalize both to midnight to avoid hours/minutes skew
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Compute difference in days
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = dueDate.getTime() - todayDate.getTime();
  const dayDiff = Math.ceil(diffMs / msPerDay);

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
  // find the folder & task
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = folder.tasks[taskIndex];

  // compute the next priority
  const order = ["urgent", "high", "medium", "low"];
  const next  = order[(order.indexOf(t.priority || "medium") + 1) % order.length];

  // send to server
  axios
    .put("/tasks", { id: t._id, priority: next })
    .then(res => {
      const updated = res.data;
      // update UI from the server’s response
      setFolders(prev =>
        prev.map(f =>
          f.id === folderId
            ? {
                ...f,
                tasks: f.tasks.map((task, i) =>
                  i === taskIndex
                    ? { ...task, priority: updated.priority }
                    : task
                )
              }
            : f
        )
      );
    })
    .catch(err => console.error("Error cycling priority:", err));
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

  // ——— EDIT MODE: defer to updateTask ———
  if (editIndex !== null) {
    updateTask();
    return;
  }

  // ——— CREATE MODE: call API ———
  axios
    .post("/tasks", {
      taskname:  newTask,
      course:    selectedFolderId,
      startDate: taskStartDate || new Date().toISOString(),
      deadline:  taskDeadline || null,
      priority:  "medium"
    })
    .then(res => {
      const t = res.data;
      // append the new task into state
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
      // reset form
      setNewTask("");
      setTaskStartDate("");
      setTaskDeadline("");
      setEditIndex(null);
      setShowTaskForm(false);
    })
    .catch(err => console.error("Error adding task:", err));
};


const updateTask = () => {
  if (editIndex === null) return;

  // Find the task we’re editing
  const folder = folders.find(f => f.id === selectedFolderId);
  const t      = folder.tasks[editIndex];

  axios
    .put("/tasks", {
      id:        t._id,
      taskname:  newTask,
      startDate: taskStartDate || null,
      deadline:  taskDeadline  || null
    })
    .then(res => {
      const u = res.data;
      // Merge updated fields back into state
      setFolders(prev =>
        prev.map(f =>
          f.id === selectedFolderId
            ? {
                ...f,
                tasks: f.tasks.map((task, i) =>
                  i === editIndex
                    ? {
                        ...task,
                        text:      u.taskname,
                        startDate: u.startDate,
                        deadline:  u.deadline,
                        completed: u.completed,
                        priority:  u.priority
                      }
                    : task
                )
              }
            : f
        )
      );
      // Cleanup form
      setNewTask("");
      setTaskStartDate("");
      setTaskDeadline("");
      setEditIndex(null);
      setShowTaskForm(false);
    })
    .catch(err => console.error("Error updating task:", err));
};



  const toggleComplete = (folderId, index) => {
  //  Find the folder and task
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = folder.tasks[index];

  // flipped flag to server
  axios
    .put("/tasks", {
      id:        t._id,
      completed: !t.completed
    })
    .then(res => {
      const updated = res.data;
      // Confetti on marking complete
      if (!t.completed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      // Update UI from the server’s response
      setFolders(prev =>
        prev.map(f =>
          f.id === folderId
            ? {
                ...f,
                tasks: f.tasks.map((task, i) =>
                  i === index
                    ? { ...task, completed: updated.completed }
                    : task
                )
              }
            : f
        )
      );
    })
    .catch(err => console.error("Error toggling task:", err));
};
  
/*
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
  */

  const formatInputDate = (value) => {
  if (!value) return "";                         // catch null, undefined, ""
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";            // catch unparseable values
  return d.toISOString().substring(0, 10);       // "YYYY-MM-DD"
};

  const editTask = (folderId, index) => {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const task = folder.tasks[index];

  // 1) Prefill the text
  setNewTask(task.text);

  // 2) Build YYYY-MM-DD or “” if missing
  const makeYMD = dt =>
    dt
      ? dt.slice ? dt.slice(0,10)                  // if it's already a "YYYY-MM-DD…" string
      : new Date(dt).toISOString().slice(0,10)     // if it's a full Date/ISO
      : "";

  setTaskStartDate(makeYMD(task.startDate));
  setTaskDeadline( makeYMD(task.deadline)  );

  // 3) Flip into edit mode
  setEditIndex(index);
  setSelectedFolderId(folderId);
  setShowTaskForm(true);
};


   const deleteTask = (folderId, index) => {
  //  confirmation
  if (!window.confirm("Delete this task permanently?")) return;

  //  find the task’s real _id
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = folder.tasks[index];

  // call DELETE /tasks
  axios
    .delete("/tasks", { data: { id: t._id } })
    .then(() => {
      //  update local state only after server confirms
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
                value={taskStartDate /*|| undefine*/}
                onChange={(e) => setTaskStartDate(e.target.value || "")}
                placeholder="Start date"
              />
              <input
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                placeholder="Deadline"
              />
              <button onClick={editIndex !== null ? updateTask : addTask}>
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
              folders.map((folder, folderIndex) => {
                const totalTasks = folder.tasks.length;
                const completedTasks = folder.tasks.filter(task => task.completed).length;
                const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return (
                  <li
                    key={folder.id}
                    className="folder-item"
                    draggable
                    onDragStart={() => setDraggedFolderIndex(folderIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedFolderIndex === null || draggedFolderIndex === folderIndex) return;

                      const bounding = e.currentTarget.getBoundingClientRect();
                      const offset = e.clientY - bounding.top;
                      const dropBefore = offset < bounding.height / 2;
                      const newIndex = dropBefore ? folderIndex : folderIndex + 1;

                      const updated = [...folders];
                      const [moved] = updated.splice(draggedFolderIndex, 1);
                      const adjustedIndex = newIndex > draggedFolderIndex ? newIndex - 1 : newIndex;
                      updated.splice(adjustedIndex, 0, moved);

                      setFolders(updated);
                      setDraggedFolderIndex(null);
                    }}
                    onDragEnd={() => setDraggedFolderIndex(null)}
                  >
                    <div
  className="folder-header"
  onClick={() => {
    if (editFolderId !== folder.id) {
      setExpandedFolderId(prev =>
        prev === folder.id ? null : folder.id
      );
      setSelectedFolderId(folder.id);
    }
  }}
  style={{
    backgroundColor:
      folder.id === expandedFolderId ? "#e3f2fd" : "#f5f5f5",
    borderLeft: `10px solid ${folder.color}`,
    display: "flex",
    alignItems: "center",
    padding: "8px",
    cursor: editFolderId === folder.id ? "default" : "pointer"
  }}
>
  {editFolderId === folder.id ? (
    <>
      <input
        type="text"
        value={editedFolderName}
        onChange={e => setEditedFolderName(e.target.value)}
        onKeyDown={e =>
          e.key === "Enter" && handleUpdateCourse(folder.id)
        }
        style={{ flex: 1, marginRight: "8px" }}
        autoFocus
      />
      <button onClick={() => handleUpdateCourse(folder.id)}>
        Save
      </button>
      <button onClick={() => setEditFolderId(null)}>
        Cancel
      </button>
    </>
  ) : (
    <>
      <span style={{ flex: 1 }}>{folder.name}</span>
      <button
        onClick={e => {
          e.stopPropagation();
          editFolder(folder.id, folder.name, folder.color);
        }}
        style={{
          background: "none",
          border: "none",
          padding: "4px",
          fontSize: "0.9rem",
          opacity: 0.7,
          cursor: "pointer"
        }}
        title="Edit course"
      >
        ✏️
      </button>
    </>
  )}
                    
                      
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
                        {completedTasks} of {totalTasks} complete
                      </div>

                      {totalTasks > 0 && (
                        <div
                          className="folder-progress-container"
                          style={{
                            marginTop: "6px",
                            background: "#ddd",
                            height: "6px",
                            borderRadius: "4px",
                            width: "100%"
                          }}
                        >
                          <div
                            className="folder-progress-bar"
                            style={{
                              width: `${completionPercent}%`,
                              height: "100%",
                              backgroundColor: "#4caf50",
                              borderRadius: "4px"
                            }}
                          ></div>
                        </div>
                      )}
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

                              const bounding = e.currentTarget.getBoundingClientRect();
                              const offset = e.clientY - bounding.top;
                              const dropBefore = offset < bounding.height / 2;
                              const newIndex = dropBefore ? index : index + 1;

                              setFolders(prevFolders => {
                                const updatedFolders = prevFolders.map(f => ({
                                  ...f,
                                  tasks: [...f.tasks]
                                }));

                                const sourceFolder = updatedFolders.find(f => f.id === draggedTaskInfo.folderId);
                                const targetFolder = updatedFolders.find(f => f.id === folder.id);

                                if (!sourceFolder || !targetFolder) return prevFolders;

                                const [movedTask] = sourceFolder.tasks.splice(draggedTaskInfo.taskIndex, 1);

                                let adjustedIndex = newIndex;
                                if (folder.id === draggedTaskInfo.folderId && newIndex > draggedTaskInfo.taskIndex) {
                                  adjustedIndex = newIndex - 1;
                                }

                                targetFolder.tasks.splice(adjustedIndex, 0, movedTask);

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
                                    style={{
                                      width: `${calculateProgress(task.startDate, task.deadline)}%`,
                                      backgroundColor:
                                        task.deadline && !task.completed && new Date(task.deadline) < new Date()
                                          ? "#e53935"
                                          : "#4caf50"
                                    }}
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
                              <button onClick={() => editTask(folder.id, index)}>✏️</button>
                              <button onClick={() => deleteTask(folder.id, index)}>❌</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })
            ) : (
              <p className="loading-text">Loading...</p>
            )}
    </ul>
                </div>

        <div className="middle-column">
          <div className="image-container">
                        <img src="main_pomodoro.png" alt="Background" className="faded-image" />
                    </div>
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

              <p>📅 Days Active: {usedDaysCount}</p>
              <p>✅ Tasks Completed Today: {totalCompleted}</p>
              <p>⏳ Tasks Finished Before Deadline: {completedBeforeDeadline}</p>
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
                        <div className="pomodoro-info">
                          <p>
                            The Pomodoro Technique was invented by Francesco Cirillo. It is commonly associated
                            with a tomato-shaped timer the inventor used to track the time intervals during the routine.
                            Just like the icons and imagery used on our Study Tracker! The process is listed as such:
                            Pick a task, set a timer, work on it, take a short break when the timer goes off, repeat! It is also
                            advised to take a much longer break after completing four pomodoros!
                            You can dig deeper into the history and benefits about the Pomodoro technique below!
                          </p>
                          <div className="button-container">
                            <button
                              onClick={() =>
                                window.open(
                                  "https://csuglobal.edu/blog/pomodoro-technique-time-management",
                                  "_blank"
                                )
                              }
                              className="pomodoro-button"
                            >
                              Learn More
                            </button>
                          </div>
                        </div>
                    </div>
                </div>
            </div>

      {/* <div className="main"></div> */}
      <Footer />
    </div>
  );
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
};;

export default StudyTracker;
