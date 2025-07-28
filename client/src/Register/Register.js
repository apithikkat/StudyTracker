import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from '../api/axios'
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import './Register.css';

function Register() {
  const [name, setName] = useState()
  const [email, setEmail] = useState()
  const [pwd, setPassword] = useState()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const registerRes = await axios.post("/register", { name, email, pwd })
      if (registerRes.status === 201) {
        const signInRes = await axios.post("/auth", { email, pwd })
        if (signInRes.status === 200) {
          navigate("/study")
        }
      } else {
        navigate("/register")
        alert("You are not registered to this service")
      }
    } catch { console.log(e) }
  }


  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrapper">
        <div className="register-box">
          <h2>Let's Get Acquainted!</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email">
                <strong>Name</strong>
              </label>
              <input type="text"
                placeholder='Enter Name'
                autoComplete='off'
                name='email'
                className='form-control rounded-0'
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="email"><strong>Email</strong></label>
              <input
                type="text"
                placeholder="Enter Email"
                autoComplete="off"
                name="email"
                className="form-control rounded-0"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password"><strong>Password</strong></label>
              <input
                type="password"
                placeholder="Enter Password"
                name="password"
                className="form-control rounded-0"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-success w-100 rounded-0">
              Register
            </button>
          </form>
          <p className="mt-3">Already have an account?</p>
          <Link to="/signin" className="btn btn-default border w-100 bg-light rounded-0 text-decoration-none">
            Sign In
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Register;