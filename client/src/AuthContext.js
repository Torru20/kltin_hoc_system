import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from './firebase'; // Đảm bảo bạn đã export auth từ file firebase.js
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Lắng nghe sự kiện thay đổi trạng thái từ Firebase (Login/Logout)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // 2. Lấy Token từ Firebase
                    const idToken = await firebaseUser.getIdToken();

                    // 3. Gửi Token sang Backend Node.js để kiểm tra/lưu vào MySQL
                    const response = await fetch('http://localhost:5000/api/users/login', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // data.user bây giờ chứa UserID, Hoten, Vaitro từ MySQL
                        setUser(data.user); 
                        localStorage.setItem('sessionToken', idToken);
                    }
                } catch (error) {
                    console.error("Lỗi xác thực hệ thống:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
                localStorage.removeItem('sessionToken');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = (userData) => {
        setUser(userData.user);
        localStorage.setItem('sessionToken', userData.sessionToken);
    };
    const logout = async () => {
        await auth.signOut(); // Đăng xuất khỏi Firebase
        setUser(null);
        localStorage.removeItem('sessionToken');
        localStorage.clear();
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isLoggedIn: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};