import React from 'react';

const AdminTable = ({ data, onUpdateStatus }) => {
  return (
    <div className="container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Program</th>
            <th>Status</th>
            <th>Actions</th>
            <th>CV</th>
          </tr>
        </thead>
        <tbody>
          {data.map((app) => (
            <tr key={app.id}>
              <td>{app.name}</td>
              <td>{app.program}</td>
              <td>{app.status}</td>
              <td>
                <button 
                  className="cta-button shortlist-btn" 
                  disabled={app.status !== 'Pending'}
                  onClick={() => onUpdateStatus(app.id, 'Shortlisted')}
                >
                  Shortlist
                </button>
                <button 
                  className="cta-button unqualified-btn" 
                  disabled={app.status !== 'Pending'}
                  onClick={() => onUpdateStatus(app.id, 'Unqualified')}
                >
                  Unqualified
                </button>
              </td>
              <td>
                <a href={`/uploads/${app.cv_path}`} target="_blank" rel="noreferrer">
                  View CV
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;