export const validateRegistration = ({ name, email, password }) => {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = "Name is required";
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (name.trim().length > 100) {
    errors.name = "Name cannot exceed 100 characters";
  }

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else {
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      errors.email = "Please enter a valid email address";
    }
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (password.length > 128) {
    errors.password = "Password cannot exceed 128 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};