export const createStudentIdentity = () => {
  const randomNumber = `${Date.now()}${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')}`;

  return {
    enrollment_number: randomNumber,
    email: `temurbekschool${randomNumber}@gmail.com`,
  };
};
